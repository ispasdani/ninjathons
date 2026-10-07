import { defineTable } from "convex/server";
import { v } from "convex/values";

import { difficulty, language } from "./problems";

// A live match (decisions §14). The server owns the clock: `startsAt` and
// `endsAt` are set when the match is made, and scheduled functions flip the
// status at those times. The problem stays hidden until the match is active.
export const matches = defineTable({
  mode: v.literal("1v1"),
  // Ranked games may change ratings; whether one actually counts is decided
  // when it ends (the daily pair limit) and kept on each player row.
  ranked: v.boolean(),
  source: v.union(v.literal("queue"), v.literal("challenge")),
  status: v.union(
    v.literal("countdown"),
    v.literal("active"),
    v.literal("finished"),
    // Ended during the countdown, before anyone saw the problem. No result.
    v.literal("cancelled"),
  ),
  problemId: v.id("problems"),
  problemVersion: v.number(),
  difficulty,
  startsAt: v.number(),
  endsAt: v.number(),
  // Set by the time-up function; the result waits for Submits sent in time
  // that are still being judged.
  timeUp: v.optional(v.boolean()),
  finishedAt: v.optional(v.number()),
  winnerId: v.optional(v.id("users")),
  reason: v.optional(
    v.union(v.literal("solved"), v.literal("time"), v.literal("forfeit"), v.literal("cancelled")),
  ),
}).index("by_status", ["status"]);

// One row per player per match: their live progress, then their result.
export const matchPlayers = defineTable({
  matchId: v.id("matches"),
  userId: v.id("users"),
  // The language picked before the match; the editor opens in it.
  language,
  // Their 1v1 rating when the match was made (1500 before a first game).
  ratingBefore: v.number(),
  submits: v.number(),
  // For the cooldown between Submits.
  lastSubmitAt: v.optional(v.number()),
  // Their best Submit so far: tests passed and when it was sent.
  bestPassed: v.number(),
  total: v.number(),
  bestAt: v.optional(v.number()),
  // When their first accepted Submit was sent.
  solvedAt: v.optional(v.number()),
  result: v.optional(v.union(v.literal("win"), v.literal("loss"), v.literal("draw"))),
  // Whether this game changed ratings and gave match XP.
  counted: v.optional(v.boolean()),
  ratingChange: v.optional(v.number()),
  xpAwarded: v.optional(v.number()),
  badgesEarned: v.optional(v.array(v.string())),
})
  .index("by_match", ["matchId"])
  .index("by_user", ["userId"]);

// The live feed both players see: counts and outcomes, never code.
export const matchEvents = defineTable({
  matchId: v.id("matches"),
  userId: v.id("users"),
  kind: v.union(v.literal("submit"), v.literal("forfeit")),
  passed: v.optional(v.number()),
  total: v.optional(v.number()),
  accepted: v.optional(v.boolean()),
}).index("by_match", ["matchId"]);
