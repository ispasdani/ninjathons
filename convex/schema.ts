import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Synced from Clerk by the webhook in http.ts.
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  // One row per user. Written only by the payment webhook; read by the
  // pro* wrappers in lib/functions.ts. No row means the free plan.
  entitlements: defineTable({
    userId: v.id("users"),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("organization")),
    expiresAt: v.number(),
  }).index("by_user", ["userId"]),
});
