import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import {
  getCurrentUserOrNull,
  getPlan,
  identityMutation,
  publicQuery,
} from "./lib/functions";

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
    return { ...user, tier };
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

    await ctx.db.delete(user._id);
  },
});
