import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, type QueryCtx } from "./_generated/server";
import {
  getCurrentUserOrNull,
  getPlan,
  identityMutation,
  publicQuery,
  userMutation,
  userQuery,
} from "./lib/functions";
import { levelProgress } from "./lib/levels";
import {
  checkUsernameRules,
  USERNAME_COOLDOWN_MS,
  USERNAME_RESERVED_MS,
  usernameKey,
  type UsernameProblem,
} from "./lib/usernames";

/**
 * The caller's own user row and plan tier, or null when signed out or before
 * the Clerk webhook has created the row. Never takes a user id as an argument,
 * so it can't be used to read someone else's account.
 */
export const getCurrentUser = publicQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const { tier } = await getPlan(ctx, user);
    return { ...user, tier, progress: levelProgress(user.xp ?? 0) };
  },
});

/**
 * Creates the caller's users row from their Clerk token if the webhook hasn't
 * yet (slow or failed delivery, or local dev where Clerk can't reach the
 * webhook). Called by the app right after sign-in. It never updates an
 * existing row: the webhook stays the sync path and patches in Clerk's full
 * data when it arrives. The lookup and insert run in one transaction, so it
 * can't race the webhook into a duplicate row.
 */
export const ensureUser = identityMutation({
  args: {},
  handler: async (ctx) => {
    const { identity } = ctx;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing) return existing._id;

    // The token may carry fewer fields than the webhook, so fall back the
    // same way toUserFields in http.ts does.
    const email = identity.email ?? "";
    const name =
      identity.name ||
      [identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
      identity.nickname ||
      email.split("@")[0] ||
      "Player";

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      imageUrl: identity.pictureUrl ?? "",
    });
  },
});

// --- Usernames (docs/notes/decisions.md §1) ---

type UsernameRefusal = UsernameProblem | "taken" | "cooldown";

/** Why `user` can't have `username`, or null when they can. */
async function usernameRefusal(ctx: QueryCtx, user: Doc<"users">, username: string): Promise<UsernameRefusal | null> {
  const rules = checkUsernameRules(username);
  if (rules) return rules;
  const key = usernameKey(username);
  const holder = await ctx.db
    .query("users")
    .withIndex("by_usernameKey", (q) => q.eq("usernameKey", key))
    .first();
  if (holder && holder._id !== user._id) return "taken";
  const now = Date.now();
  const reservations = await ctx.db
    .query("usernameReservations")
    .withIndex("by_usernameKey", (q) => q.eq("usernameKey", key))
    .collect();
  // Reserved for someone else: an account that changed away from it, or a deleted one.
  if (reservations.some((r) => r.expiresAt > now && r.userId !== user._id)) return "taken";
  // A real change (not a first pick, not only different letter case) waits for the cooldown.
  const changing = user.usernameKey !== undefined && user.usernameKey !== key;
  if (changing && user.usernameChangedAt !== undefined && now - user.usernameChangedAt < USERNAME_COOLDOWN_MS) {
    return "cooldown";
  }
  return null;
}

/** Whether the caller may take `username`: for the onboarding form, as the user types. */
export const checkUsername = userQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const refusal = await usernameRefusal(ctx, ctx.user, username);
    return refusal ? { ok: false as const, refusal } : { ok: true as const };
  },
});

/**
 * Sets or changes the caller's username. The uniqueness check and the write
 * happen in this one transaction, so two people can't both get a name.
 * Throws ConvexError("USERNAME_<REASON>"), e.g. USERNAME_TAKEN. A change
 * reserves the old name for 90 days (only this user may take it back) and
 * starts the 30-day cooldown; the first pick and letter-case changes don't.
 */
export const setUsername = userMutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const { user } = ctx;
    const refusal = await usernameRefusal(ctx, user, username);
    if (refusal) throw new ConvexError(`USERNAME_${refusal.toUpperCase()}`);
    if (user.username === username) return;

    const key = usernameKey(username);
    const now = Date.now();
    const changing = user.usernameKey !== undefined && user.usernameKey !== key;
    if (changing) {
      await ctx.db.insert("usernameReservations", {
        usernameKey: user.usernameKey!,
        userId: user._id,
        expiresAt: now + USERNAME_RESERVED_MS,
      });
    }
    // Taking back a name this user reserved earlier releases the reservation.
    const own = await ctx.db
      .query("usernameReservations")
      .withIndex("by_usernameKey", (q) => q.eq("usernameKey", key))
      .collect();
    for (const r of own) if (r.userId === user._id) await ctx.db.delete(r._id);

    await ctx.db.patch(user._id, {
      username,
      usernameKey: key,
      ...(changing ? { usernameChangedAt: now } : {}),
    });
  },
});

// Called by the Clerk webhook for user.created and user.updated. Clerk retries
// deliveries, so this has to be safe to run more than once.
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("users", args);
  },
});

// Called by the Clerk webhook for user.deleted. Removes the account and
// everything keyed to it (GDPR account deletion). A missing user is not an
// error, so retried deliveries succeed.
export const deleteFromClerk = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) return;

    const plans = await ctx.db
      .query("entitlements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const plan of plans) await ctx.db.delete(plan._id);

    const xp = await ctx.db
      .query("xpLedger")
      .withIndex("by_user_key", (q) => q.eq("userId", user._id))
      .collect();
    for (const entry of xp) await ctx.db.delete(entry._id);

    // Badges go too, and stop counting toward rarity.
    const badges = await ctx.db
      .query("userBadges")
      .withIndex("by_user_badge", (q) => q.eq("userId", user._id))
      .collect();
    for (const badge of badges) {
      const count = await ctx.db
        .query("badgeCounts")
        .withIndex("by_badge", (q) => q.eq("badgeId", badge.badgeId))
        .unique();
      if (count) await ctx.db.patch(count._id, { holders: Math.max(0, count.holders - 1) });
      await ctx.db.delete(badge._id);
    }

    // Their ratings and history go; opponents keep their own rating changes.
    for (const table of ["ratings", "ratingHistory"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user_area", (q) => q.eq("userId", user._id))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }

    // The name stays reserved for 90 days after the account is gone.
    if (user.usernameKey) {
      await ctx.db.insert("usernameReservations", {
        usernameKey: user.usernameKey,
        expiresAt: Date.now() + USERNAME_RESERVED_MS,
      });
    }

    await ctx.db.delete(user._id);
  },
});
