import { defineTable } from "convex/server";
import { v } from "convex/values";

import { language } from "./problems";

// The daily challenge (decisions §15): one problem per UTC day, picked by
// daily.pick. A problem is never picked twice while unused ones are left.
export const dailyChallenges = defineTable({
  day: v.string(), // "2026-10-07"
  problemId: v.id("problems"),
})
  .index("by_day", ["day"])
  .index("by_problem", ["problemId"]);

// A player's go at one day's daily: written when they first open it (or first
// submit to it), solved by the first accepted Submit sent that day.
export const dailyResults = defineTable({
  userId: v.id("users"),
  day: v.string(),
  openedAt: v.number(),
  // When the accepted Submit was sent, and how long after opening.
  solvedAt: v.optional(v.number()),
  timeMs: v.optional(v.number()),
  language: v.optional(language),
})
  .index("by_user_day", ["userId", "day"])
  // Unsolved rows have no timeMs and sort first, so `gte("timeMs", 0)` reads
  // the solves, fastest first.
  .index("by_day_time", ["day", "timeMs"]);

// One row per player who has solved a daily. The streak counts days in a row
// with the daily solved; a freeze covers a missed day (decisions §15).
export const streaks = defineTable({
  userId: v.id("users"),
  current: v.number(),
  best: v.number(),
  totalSolved: v.number(),
  freezes: v.number(),
  // The last day the streak is good for (solved or frozen). Absent while the
  // streak is 0, so the nightly settle only reads live streaks.
  coveredThrough: v.optional(v.string()),
  // Minus the time `current` last went up: on the Daily board, whoever got
  // there first ranks higher.
  tieBreak: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_covered", ["coveredThrough"])
  .index("by_board", ["current", "totalSolved", "tieBreak"]);

// Weekly challenge sets, seeded from weekly/<slug>/set.json (decisions §15).
// Its problems stay unreleased until a Monday cron gives the set its week.
export const weeklySets = defineTable({
  slug: v.string(),
  title: v.string(),
  theme: v.string(), // markdown
  // Sets start in this order, one per week.
  order: v.number(),
  problemIds: v.array(v.id("problems")),
  // The ISO week it ran, "2026-W42"; absent until it starts.
  week: v.optional(v.string()),
  // Set once the week is over and its top 10% badges are granted.
  settled: v.optional(v.boolean()),
})
  .index("by_slug", ["slug"])
  .index("by_week", ["week"])
  .index("by_order", ["order"]);

// A player's go at one problem of a weekly set: opened, then maybe solved.
export const weeklyProgress = defineTable({
  userId: v.id("users"),
  week: v.string(),
  problemId: v.id("problems"),
  openedAt: v.number(),
  solvedAt: v.optional(v.number()),
  points: v.optional(v.number()),
}).index("by_user_week", ["userId", "week", "problemId"]);

// A player's week, for the Weekly board: points, then less total time.
export const weeklyResults = defineTable({
  userId: v.id("users"),
  week: v.string(),
  points: v.number(),
  timeMs: v.number(),
  solved: v.number(),
  // Minus timeMs, so a descending index reads the board in order.
  tieBreak: v.number(),
})
  .index("by_user_week", ["userId", "week"])
  .index("by_week_board", ["week", "points", "tieBreak"]);
