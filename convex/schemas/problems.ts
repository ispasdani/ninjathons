import { defineTable } from "convex/server";
import { v } from "convex/values";

export const difficulty = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
);

// Everything in this table is safe to send to the browser. Hidden tests live
// in problemTests so a query returning a problem row can't leak them.
export const problems = defineTable({
  slug: v.string(),
  title: v.string(),
  statement: v.string(), // markdown
  difficulty,
  tags: v.array(v.string()),
  // Shown in the statement and used by Run.
  examples: v.array(
    v.object({
      input: v.string(),
      output: v.string(),
      explanation: v.optional(v.string()),
    }),
  ),
  timeLimitMs: v.number(),
  memoryLimitMb: v.number(),
  // Hand-written hints, so learning works before the AI coach exists.
  hints: v.array(v.string()),
  // beta: practice only. approved: may appear in ranked matches.
  status: v.union(v.literal("draft"), v.literal("beta"), v.literal("approved")),
})
  .index("by_slug", ["slug"])
  .index("by_status", ["status"]);

// Hidden tests. Read only from internal functions, never from a public one.
// Input and output are plain strings for either judging model (raw stdin, or
// serialized arguments for function signatures).
export const problemTests = defineTable({
  problemId: v.id("problems"),
  order: v.number(),
  input: v.string(),
  expectedOutput: v.string(),
}).index("by_problem", ["problemId", "order"]);
