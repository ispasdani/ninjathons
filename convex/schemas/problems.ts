import { defineTable } from "convex/server";
import { v } from "convex/values";

export const difficulty = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
);

// Types a function-mode signature can use. The starter-code and driver
// generators support exactly these, in all five languages. ListNode and
// TreeNode come later.
export const valueType = v.union(
  v.literal("int"),
  v.literal("long"),
  v.literal("double"),
  v.literal("bool"),
  v.literal("string"),
  v.literal("int[]"),
  v.literal("long[]"),
  v.literal("double[]"),
  v.literal("bool[]"),
  v.literal("string[]"),
  v.literal("int[][]"),
  v.literal("long[][]"),
  v.literal("double[][]"),
  v.literal("bool[][]"),
  v.literal("string[][]"),
);

// How the user's code is judged (docs/notes/decisions.md). The problem sets the
// mode, never the player, so both sides of a duel get the same one. Either way
// the runner only sees stdin/stdout: in function mode a generated driver reads
// the test, calls the user's function and prints the result.
export const judge = v.union(
  // The user fills in one function. Starter code and driver are generated
  // per language from this signature.
  v.object({
    mode: v.literal("function"),
    signature: v.object({
      functionName: v.string(),
      params: v.array(v.object({ name: v.string(), type: valueType })),
      returns: valueType,
    }),
  }),
  // The user writes the whole program. The statement must spell out the exact
  // input and output format.
  v.object({ mode: v.literal("stdio") }),
);

// How an output is compared with the expected one.
export const checker = v.union(
  v.object({ kind: v.literal("exact") }), // ignores trailing whitespace
  v.object({ kind: v.literal("float"), tolerance: v.number() }),
  v.object({ kind: v.literal("unordered") }), // same items, any order
);

// Everything in this table is safe to send to the browser. Hidden tests live
// in problemTests so a query returning a problem row can't leak them.
export const problems = defineTable({
  slug: v.string(),
  title: v.string(),
  statement: v.string(), // markdown
  difficulty,
  tags: v.array(v.string()),
  judge,
  checker,
  // Shown in the statement and used by Run. Same format as problemTests.
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
// In function mode, input is a JSON object of arguments ({"a":2,"b":3}) and
// expectedOutput is the JSON return value. In stdio mode both are plain text.
export const problemTests = defineTable({
  problemId: v.id("problems"),
  order: v.number(),
  input: v.string(),
  expectedOutput: v.string(),
}).index("by_problem", ["problemId", "order"]);
