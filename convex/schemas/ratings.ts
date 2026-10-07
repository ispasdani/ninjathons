import { defineTable } from "convex/server";
import { v } from "convex/values";

// Each competitive mode has its own rating and leaderboard (roadmap, Compete).
// 1v1 uses Glicko-2; Territory's OpenSkill rating comes with Territory.
export const ratingArea = v.union(v.literal("1v1"), v.literal("territory"));

// A user's current rating in one area. No row means they haven't played a
// ranked game there yet. Written only by lib/ratings.ts, from internal
// mutations; the rating is hidden until 10 ranked games (provisional).
export const ratings = defineTable({
  userId: v.id("users"),
  area: ratingArea,
  rating: v.number(),
  rd: v.number(),
  volatility: v.number(),
  games: v.number(),
  wins: v.number(),
  losses: v.number(),
  draws: v.number(),
  lastGameAt: v.number(),
})
  .index("by_user_area", ["userId", "area"])
  .index("by_area_rating", ["area", "rating"]);

// One row per rated game, for the rating chart on the profile.
export const ratingHistory = defineTable({
  userId: v.id("users"),
  area: ratingArea,
  rating: v.number(),
  change: v.number(),
  opponentId: v.optional(v.id("users")),
}).index("by_user_area", ["userId", "area"]);
