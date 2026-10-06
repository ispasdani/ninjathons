import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { LANGUAGES, problemLanguages } from "./judge/languages";
import { publicQuery } from "./lib/functions";
import {
  checker,
  difficulty,
  judge,
  language,
} from "./schemas/problems";

/** Published problems for the list on the dashboard. The full library page comes in phase 2. */
export const list = publicQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("problems").take(200);
    return rows
      .filter((p) => p.status !== "draft")
      .map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty }));
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
    if (!problem || problem.status === "draft") return null;
    const languages = problemLanguages(problem.languages).map((id) => ({
      id,
      label: LANGUAGES[id].label,
      version: LANGUAGES[id].version,
      starterCode:
        problem.judge.mode === "function" ? LANGUAGES[id].starterCode(problem.judge.signature) : "",
      timeLimitMs: Math.round(problem.limits.timeMs * LANGUAGES[id].timeMultiplier),
    }));
    return {
      _id: problem._id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      tags: problem.tags,
      mode: problem.judge.mode,
      examples: problem.examples,
      hints: problem.hints,
      memoryLimitMb: problem.limits.memoryMb,
      languages,
    };
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
    const { problem, hidden } = JSON.parse(await blob.text());
    const file = await ctx.storage.store(
      new Blob([JSON.stringify(hidden)], { type: "application/json" }),
    );
    await ctx.storage.delete(upload);
    return await ctx.runMutation(internal.problems.seed, {
      problem,
      tests: { file, count: hidden.length },
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
  },
  handler: async (ctx, { problem, tests }) => {
    const existing = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", problem.slug))
      .unique();
    if (existing && problem.version < existing.version) {
      throw new Error(`${problem.slug}: version ${problem.version} is older than the seeded ${existing.version}`);
    }
    const problemId = existing
      ? (await ctx.db.replace(existing._id, problem), existing._id)
      : await ctx.db.insert("problems", problem);

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
