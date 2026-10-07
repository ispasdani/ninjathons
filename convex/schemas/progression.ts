import { defineTable } from "convex/server";
import { v } from "convex/values";

// Each area keeps its own points and leaderboard (docs/01, Progression).
export const xpSource = v.union(
  v.literal("solve"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("lesson"),
  v.literal("module"),
  v.literal("match1v1"),
  v.literal("territory"),
  v.literal("ninjathon"),
);

// Append-only XP ledger. `key` is unique per user and awarded action (for
// example "solve:<slug>:<lang>"), enforced by awardXp in lib/xp.ts, so a
// retried request can never award XP twice. Levels, titles and badges are
// computed from this table.
export const xpLedger = defineTable({
  userId: v.id("users"),
  key: v.string(),
  source: xpSource,
  amount: v.number(),
}).index("by_user_key", ["userId", "key"]);

// Badges a user has earned. `badgeId` is an id from BADGES in lib/badges.ts;
// one row per user and badge, written only by grantBadge there. Earned badges
// are permanent, even if the badge is later retired.
export const userBadges = defineTable({
  userId: v.id("users"),
  badgeId: v.string(),
}).index("by_user_badge", ["userId", "badgeId"]);

// How many users hold each badge, for rarity. Kept by grantBadge and by
// account deletion. Rarity is holders / holders of "first-solve" (players with
// at least one solve, decisions §13).
export const badgeCounts = defineTable({
  badgeId: v.string(),
  holders: v.number(),
}).index("by_badge", ["badgeId"]);
