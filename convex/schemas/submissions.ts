import { defineTable } from "convex/server";
import { v, type Infer } from "convex/values";

import { language } from "./problems";

export const verdictStatus = v.union(
  v.literal("accepted"),
  v.literal("wrong_answer"),
  v.literal("runtime_error"),
  v.literal("time_limit"),
  v.literal("memory_limit"),
  v.literal("output_limit"),
  v.literal("compile_error"),
);

// One judged test. Input, expected and actual output are only filled in for
// tests the user may see (the examples); hidden tests carry the outcome only.
export const testResult = v.object({
  status: verdictStatus,
  timeMs: v.number(),
  visible: v.boolean(),
  input: v.optional(v.string()),
  expected: v.optional(v.string()),
  actual: v.optional(v.string()),
  // What the program printed itself (its debug output), truncated.
  logs: v.optional(v.string()),
});

export const verdict = v.object({
  status: verdictStatus,
  passed: v.number(),
  total: v.number(),
  // Slowest test that ran, in milliseconds.
  timeMs: v.number(),
  // Compiler or interpreter error output, for compile_error.
  compileOutput: v.optional(v.string()),
  // Every test that ran, in order. Submit stops at the first failure.
  tests: v.array(testResult),
});

export type VerdictStatus = Infer<typeof verdictStatus>;
export type TestResult = Infer<typeof testResult>;
export type Verdict = Infer<typeof verdict>;

// Run judges the examples only and gives no XP; Submit judges every test.
export const submissionKind = v.union(v.literal("run"), v.literal("submit"));

export const submissions = defineTable({
  userId: v.id("users"),
  problemId: v.id("problems"),
  // The problem version whose tests judged this submission.
  problemVersion: v.number(),
  language,
  source: v.string(),
  kind: submissionKind,
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("done"),
    // The runner failed (not the user's code). `error` says why.
    v.literal("error"),
  ),
  verdict: v.optional(verdict),
  error: v.optional(v.string()),
  finishedAt: v.optional(v.number()),
  // XP this submission earned: set on an accepted Submit that was the first
  // solve of the problem in this language.
  xpAwarded: v.optional(v.number()),
  // The level this submission's XP took the user to, when it crossed one.
  levelReached: v.optional(v.number()),
  // Badges first earned by this submission (ids from lib/badges.ts).
  badgesEarned: v.optional(v.array(v.string())),
  // Set when this Submit solved the day's daily challenge: its XP (absent if
  // already awarded), the streak it reached, and whether it earned a freeze.
  daily: v.optional(
    v.object({ xp: v.optional(v.number()), streak: v.number(), freezeEarned: v.optional(v.boolean()) }),
  ),
  // Set when this Submit solved a problem of the week's set: its points, XP
  // (absent if already awarded), and whether it finished the set.
  weekly: v.optional(
    v.object({ points: v.number(), xp: v.optional(v.number()), setComplete: v.optional(v.boolean()) }),
  ),
  // Set when the submission was sent in a match.
  matchId: v.optional(v.id("matches")),
  // Set while its sandbox waits for Vercel's per-minute limit, so the page can
  // say why it's taking longer.
  waitingForRunner: v.optional(v.boolean()),
})
  .index("by_user", ["userId"])
  .index("by_match", ["matchId"])
  .index("by_user_problem", ["userId", "problemId"])
  .index("by_user_status", ["userId", "status"]);
