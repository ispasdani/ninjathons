import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { getCurrentUserOrNull, getPlan, publicQuery } from "./lib/functions";

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

    await ctx.db.delete(user._id);
  },
});
