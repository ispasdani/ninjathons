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

// Players looking for a ranked 1v1 match (decisions §14). One row per player,
// removed when they're matched, leave, or stop sending heartbeats.
export const matchQueue = defineTable({
  userId: v.id("users"),
  language,
  // Their 1v1 rating when they joined.
  rating: v.number(),
  joinedAt: v.number(),
  // The page pings while it's open; stale rows are dropped by the pass.
  lastSeenAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_joined", ["joinedAt"]);

// A single row: when the next pairing pass is due. The pass keeps itself
// scheduled while anyone is queued, and this stops two loops running at once.
export const matchmaking = defineTable({
  nextPassAt: v.number(),
});

// A challenge to a 1v1 match: sent to a username, or as a link anyone signed
// in can open (decisions §14). Accepting makes the match at once. Expiry is
// read from `expiresAt`; nothing rewrites old rows.
export const challenges = defineTable({
  fromId: v.id("users"),
  // Absent for a link challenge until someone accepts it.
  toId: v.optional(v.id("users")),
  // For the link, /challenge/<code>.
  code: v.string(),
  ranked: v.boolean(),
  // Unranked challenges may fix the difficulty; ranked ones follow the ratings.
  difficulty: v.optional(difficulty),
  fromLanguage: language,
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("declined"),
    v.literal("cancelled"),
  ),
  expiresAt: v.number(),
  matchId: v.optional(v.id("matches")),
})
  .index("by_code", ["code"])
  .index("by_from_status", ["fromId", "status"])
  .index("by_to_status", ["toId", "status"]);
