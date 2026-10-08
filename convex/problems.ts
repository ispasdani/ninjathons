import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { getCurrentUserOrNull, publicQuery } from "./lib/functions";
import { isListed, problemView } from "./lib/problems";
import {
  checker,
  difficulty,
  judge,
  language,
} from "./schemas/problems";

/**
 * Every published problem for the library, with the caller's own status on
 * each when signed in: solved (an accepted Submit) or attempted (any other
 * Submit). Public: signed-out visitors get the list without statuses.
 */
export const library = publicQuery({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.db.query("problems").take(1000)).filter(isListed);
    const status = new Map<string, "solved" | "attempted">();
    const user = await getCurrentUserOrNull(ctx);
    if (user) {
      // Until phase 3 keeps a table of solves, read the user's submissions.
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const s of submissions) {
        if (s.kind !== "submit" || s.status !== "done") continue;
        if (s.verdict?.status === "accepted") status.set(s.problemId, "solved");
        else if (!status.has(s.problemId)) status.set(s.problemId, "attempted");
      }
    }
    return rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags,
      mode: p.judge.mode,
      status: status.get(p._id) ?? null,
    }));
  },
});

/**
 * A published problem for its solve page, with starter code per language.
 * Hidden tests live in problemTests and are never returned.
 */
export const getBySlug = publicQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!problem || !isListed(problem)) return null;
    return problemView(problem);
  },
});

// --- Seeding (npm run problems:seed, through `npx convex run`) ---
// The script uploads one JSON package per problem ({ problem, hidden }) to file
// storage, then calls seedFromUpload with its id. Going through storage keeps
// large tests out of command lines and documents.

/** Where the seed script uploads a problem package. */
export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/** Unpacks an uploaded package: hidden tests become their own file, the rest goes to `seed`. */
export const seedFromUpload = internalAction({
  args: { upload: v.id("_storage") },
  handler: async (ctx, { upload }): Promise<{ problemId: string; created: boolean }> => {
    const blob = await ctx.storage.get(upload);
    if (!blob) throw new Error("upload not found");
    const { problem, hidden, weeklySet } = JSON.parse(await blob.text());
    const file = await ctx.storage.store(
      new Blob([JSON.stringify(hidden)], { type: "application/json" }),
    );
    await ctx.storage.delete(upload);
    return await ctx.runMutation(internal.problems.seed, {
      problem,
      tests: { file, count: hidden.length },
      weeklySet,
    });
  },
});

/**
 * Inserts or updates a problem by slug, and points its version at the
 * uploaded tests file. Re-running replaces the file of that version; tests
 * of older versions are kept, since submissions record which version judged them.
 */
export const seed = internalMutation({
  args: {
    problem: v.object({
      slug: v.string(),
      title: v.string(),
      statement: v.string(),
      difficulty,
      tags: v.array(v.string()),
      judge,
      checker,
      examples: v.array(
        v.object({ input: v.string(), output: v.string(), explanation: v.optional(v.string()) }),
      ),
      limits: v.object({ timeMs: v.number(), memoryMb: v.number() }),
      languages: v.union(v.literal("all"), v.array(language)),
      pool: v.union(v.literal("practice"), v.literal("ranked"), v.literal("contest")),
      version: v.number(),
      hints: v.array(v.string()),
      status: v.union(v.literal("draft"), v.literal("beta"), v.literal("approved")),
    }),
    tests: v.object({ file: v.id("_storage"), count: v.number() }),
    // The weekly set (weekly/<slug>/set.json) listing this problem, if any.
    weeklySet: v.optional(v.string()),
  },
  handler: async (ctx, { problem, tests, weeklySet }) => {
    const existing = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", problem.slug))
      .unique();
    if (existing && problem.version < existing.version) {
      throw new Error(`${problem.slug}: version ${problem.version} is older than the seeded ${existing.version}`);
    }
    // A weekly set's problem stays hidden until its set starts, even on its
    // first seed, before the set itself is seeded (decisions §15).
    const set = weeklySet
      ? await ctx.db
          .query("weeklySets")
          .withIndex("by_slug", (q) => q.eq("slug", weeklySet))
          .unique()
      : null;
    const row = { ...problem, unreleased: (weeklySet !== undefined && set?.week === undefined) || undefined };
    const problemId = existing
      ? (await ctx.db.replace(existing._id, row), existing._id)
      : await ctx.db.insert("problems", row);

    const current = await ctx.db
      .query("problemTests")
      .withIndex("by_problem_version", (q) => q.eq("problemId", problemId).eq("version", problem.version))
      .unique();
    if (current) {
      if (current.file !== tests.file) await ctx.storage.delete(current.file);
      await ctx.db.patch(current._id, tests);
    } else {
      await ctx.db.insert("problemTests", { problemId, version: problem.version, ...tests });
    }
    return { problemId, created: !existing };
  },
});

/** A problem and its current hidden tests file, for convex/benchmark.ts. */
export const loadWithTests = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!problem) return null;
    const tests = await ctx.db
      .query("problemTests")
      .withIndex("by_problem_version", (q) => q.eq("problemId", problem._id).eq("version", problem.version))
      .unique();
    return { problem, testsFile: tests?.file ?? null };
  },
});
