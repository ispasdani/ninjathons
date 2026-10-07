import { defineTable } from "convex/server";
import { v } from "convex/values";

// Global and Country ranks, rebuilt every few minutes by leaderboards.ts
// (plan, Leaderboards: technical). One row per ranked player per board and
// version. `board` is a board key from lib/leaderboards.ts ("level",
// "level-month:2026-10", "1v1"). Group boards are computed live instead.
export const leaderboardSnapshots = defineTable({
  board: v.string(),
  version: v.number(),
  userId: v.id("users"),
  value: v.number(),
  rank: v.number(),
  // Absent when the player hasn't set a country.
  country: v.optional(v.string()),
  countryRank: v.optional(v.number()),
})
  .index("by_board_rank", ["board", "version", "rank"])
  .index("by_board_user", ["board", "version", "userId"])
  .index("by_board_country", ["board", "version", "country", "countryRank"])
  .index("by_user", ["userId"]);

// Which snapshot version of each board is live, and which is being built.
// Readers only ever see a finished version.
export const leaderboardVersions = defineTable({
  board: v.string(),
  live: v.optional(v.number()),
  building: v.optional(v.number()),
  builtAt: v.optional(v.number()),
}).index("by_board", ["board"]);
