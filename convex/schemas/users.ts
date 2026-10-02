import { defineTable } from "convex/server";
import { v } from "convex/values";

// Synced from Clerk by the webhook in http.ts. `username` and `country` are
// set by the platform (onboarding, settings), never by the webhook, so a
// Clerk update can't overwrite them.
export const users = defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  username: v.optional(v.string()),
  // ISO 3166-1 alpha-2, for the Country leaderboard scope.
  country: v.optional(v.string()),
})
  .index("by_clerkId", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_username", ["username"]);

// One row per user (organizations come in V2). Written only by the payment
// webhook; read by the pro* wrappers in lib/functions.ts. No row means the
// free plan.
export const entitlements = defineTable({
  userId: v.id("users"),
  tier: v.union(v.literal("free"), v.literal("pro"), v.literal("organization")),
  expiresAt: v.number(),
}).index("by_user", ["userId"]);
