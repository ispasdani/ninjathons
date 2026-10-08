import { defineTable } from "convex/server";
import { v } from "convex/values";

export const difficulty = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
);

// The 7 code languages (docs/notes/decisions.md §8). HTML and CSS have their
// own judge, in the browser (the "web" mode below, decisions §17).
export const language = v.union(
  v.literal("javascript"),
  v.literal("typescript"),
  v.literal("python"),
  v.literal("java"),
  v.literal("csharp"),
  v.literal("cpp"),
  v.literal("rust"),
);

// Types a function-mode signature can use. Every driver generator supports
// exactly these. ListNode and TreeNode come later.
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

// A function-mode problem's function, defined once per problem; every
// language's starter code and driver are generated from it.
export const signature = v.object({
  functionName: v.string(),
  params: v.array(v.object({ name: v.string(), type: valueType })),
  returns: valueType,
});

// One check of an HTML and CSS challenge (decisions §17). Every element the
// selector matches in the player's page is compared with the one at the same
// place in the target: always how many there are, and as asked their text,
// computed styles, and position and size (within `tolerance` pixels, default 4).
export const webCheck = v.object({
  selector: v.string(),
  text: v.optional(v.boolean()),
  styles: v.optional(v.array(v.string())),
  box: v.optional(v.boolean()),
  tolerance: v.optional(v.number()),
});

export const webFiles = v.object({ html: v.string(), css: v.string() });

// How the user's code is judged (docs/notes/decisions.md). The problem sets the
// mode, never the player, so both sides of a duel get the same one. Either way
// the runner only sees stdin/stdout: in function mode a generated driver reads
// the test, calls the user's function and prints the result.
export const judge = v.union(
  // The user fills in one function. Starter code and driver are generated
  // per language from this signature.
  v.object({
    mode: v.literal("function"),
    signature,
  }),
  // The user writes the whole program. The statement must spell out the exact
  // input and output format.
  v.object({ mode: v.literal("stdio") }),
  // An HTML and CSS challenge, judged in the browser (decisions §17): build the
  // same output as the target. Never sent to the code runner. The player edits
  // the files in `edit`, starting from `starter`; the pages are compared at
  // each viewport width.
  v.object({
    mode: v.literal("web"),
    edit: v.array(v.union(v.literal("html"), v.literal("css"))),
    target: webFiles,
    starter: webFiles,
    checks: v.array(webCheck),
    viewports: v.array(v.number()),
  }),
);

// How an output is compared with the expected one.
export const checker = v.union(
  v.object({ kind: v.literal("exact") }), // ignores trailing whitespace
  v.object({ kind: v.literal("float"), tolerance: v.number() }),
  v.object({ kind: v.literal("unordered") }), // same items, any order
);

// Everything in this table is safe to send to the browser. Hidden tests live
// in problemTests so a query returning a problem row can't leak them.
// Rows are written only by the seed script (problems/ folder, decisions §7).
export const problems = defineTable({
  slug: v.string(), // never changes once published
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
  // Base limits. Each language multiplies the time limit by its own factor
  // (convex/judge/languages.ts).
  limits: v.object({ timeMs: v.number(), memoryMb: v.number() }),
  languages: v.union(v.literal("all"), v.array(language)),
  // practice: plain files. ranked and contest: tests encrypted in the repo.
  pool: v.union(v.literal("practice"), v.literal("ranked"), v.literal("contest")),
  // Goes up whenever the tests change; every submission records it.
  version: v.number(),
  // Hand-written hints, so learning works before the AI coach exists.
  hints: v.array(v.string()),
  // beta: practice only. approved: may appear in ranked matches.
  status: v.union(v.literal("draft"), v.literal("beta"), v.literal("approved")),
  // In a weekly set that hasn't started: hidden everywhere until its Monday
  // (decisions §15). Set by the weekly seed, cleared when the set starts.
  unreleased: v.optional(v.boolean()),
})
  .index("by_slug", ["slug"])
  .index("by_status", ["status"]);

// Hidden tests, one row per problem version. The tests themselves are one
// JSON file in Convex file storage (an array of {input, expectedOutput}),
// because large tests run to megabytes and a document holds at most 1 MB.
// In function mode, input is a JSON object of arguments ({"a":2,"b":3}) and
// expectedOutput is the JSON return value. In stdio mode both are plain text.
// Read only from internal functions; never call storage.getUrl on `file`.
export const problemTests = defineTable({
  problemId: v.id("problems"),
  version: v.number(),
  file: v.id("_storage"),
  count: v.number(),
}).index("by_problem_version", ["problemId", "version"]);

// A Vercel Sandbox drive holding one hidden tests file's inputs (never the
// expected outputs), mounted read-only into Submit sandboxes so the inputs
// aren't uploaded every time (decisions §5). One per tests file, so a drive
// never changes once filled. Written only by convex/testDrives.ts.
export const testDrives = defineTable({
  file: v.id("_storage"),
  drive: v.string(),
  // When filling started, so a crashed fill can be retried.
  startedAt: v.number(),
  // Set once the drive is filled and safe to mount.
  readyAt: v.optional(v.number()),
  // The gzipped JSON inputs' size: small files upload faster than a mount.
  bytes: v.optional(v.number()),
}).index("by_file", ["file"]);
