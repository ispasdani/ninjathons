import { defineTable } from "convex/server";
import { v } from "convex/values";

// Synced from Clerk by the webhook in http.ts. `name` is the free-form display
// name. The username fields and `country` are set by the platform (onboarding,
// settings), never by the webhook, so a Clerk update can't overwrite them.
// Username rules: docs/notes/decisions.md.
export const users = defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  // The handle as the user typed it ("Dani"), shown in the UI.
  username: v.optional(v.string()),
  // Lowercased copy ("dani"). Uniqueness is checked on this field, in the same
  // mutation that sets it, so "Dani" and "dani" can't both exist.
  usernameKey: v.optional(v.string()),
  // For the change cooldown.
  usernameChangedAt: v.optional(v.number()),
  // ISO 3166-1 alpha-2, for the Country leaderboard scope.
  country: v.optional(v.string()),
  // Total XP, the sum of this user's xpLedger rows. Written only by awardXp
  // in lib/xp.ts; absent means 0. Level and title are computed from it.
  xp: v.optional(v.number()),
  // Minus the time `xp` last changed. On equal XP whoever got there first
  // ranks higher, and a descending index on ["xp", "xpTieBreak"] reads them in
  // exactly that order.
  xpTieBreak: v.optional(v.number()),
})
  .index("by_clerkId", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_usernameKey", ["usernameKey"])
  .index("by_xp", ["xp", "xpTieBreak"]);

// One row per user (organizations come in V2). Written only by the payment
// webhook; read by the pro* wrappers in lib/functions.ts. No row means the
// free plan.
export const entitlements = defineTable({
  userId: v.id("users"),
  tier: v.union(v.literal("free"), v.literal("pro"), v.literal("organization")),
  expiresAt: v.number(),
}).index("by_user", ["userId"]);

// Usernames given up by a change or a deleted account, held for 90 days so
// nobody can take a known player's old name right away (decisions §1, §4).
// Expired rows are ignored by the checks.
export const usernameReservations = defineTable({
  usernameKey: v.string(),
  // The account that changed away from it may take it back. Absent when the
  // account was deleted.
  userId: v.optional(v.id("users")),
  expiresAt: v.number(),
}).index("by_usernameKey", ["usernameKey"]);
