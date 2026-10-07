import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { problemLanguages } from "./judge/languages";
import { userMutation, userQuery } from "./lib/functions";
import { awardXp, SOLVE_XP, solveKey } from "./lib/xp";
import { language } from "./schemas/problems";
import { submissionKind, verdict } from "./schemas/submissions";

const MAX_SOURCE_BYTES = 64 * 1024;
// A submission still queued or running after this long is treated as lost
// (for example the action crashed), so it no longer blocks the next one.
const STUCK_AFTER_MS = 2 * 60 * 1000;

/**
 * Run (examples only) or Submit (every test). One submission at a time per
 * user; the judging happens in judging.ts, and the page follows the row live.
 */
export const create = userMutation({
  args: {
    slug: v.string(),
    language,
    source: v.string(),
    kind: submissionKind,
  },
  handler: async (ctx, { slug, language, source, kind }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!problem || problem.status === "draft") throw new ConvexError("PROBLEM_NOT_FOUND");
    if (!problemLanguages(problem.languages).includes(language)) throw new ConvexError("LANGUAGE_NOT_ALLOWED");
    if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) throw new ConvexError("SOURCE_TOO_LONG");

    for (const status of ["queued", "running"] as const) {
      const inFlight = await ctx.db
        .query("submissions")
        .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id).eq("status", status))
        .order("desc")
        .first();
      if (inFlight && Date.now() - inFlight._creationTime < STUCK_AFTER_MS) {
        throw new ConvexError("SUBMISSION_IN_PROGRESS");
      }
    }

    const submissionId = await ctx.db.insert("submissions", {
      userId: ctx.user._id,
      problemId: problem._id,
      problemVersion: problem.version,
      language,
      source,
      kind,
      status: "queued",
    });
    await ctx.scheduler.runAfter(0, internal.judging.judge, { submissionId });
    return submissionId;
  },
});

/** One of the caller's own submissions, or null. */
export const get = userQuery({
  args: { id: v.id("submissions") },
  handler: async (ctx, { id }) => {
    const submission = await ctx.db.get(id);
    if (!submission || submission.userId !== ctx.user._id) return null;
    return submission;
  },
});

/**
 * The caller's own submissions to one problem, newest first, for the
 * Submissions tab: a summary per row; the code comes from `get` when opened.
 */
export const mine = userQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!problem) return [];
    const rows = await ctx.db
      .query("submissions")
      .withIndex("by_user_problem", (q) => q.eq("userId", ctx.user._id).eq("problemId", problem._id))
      .order("desc")
      .take(50);
    return rows.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      kind: s.kind,
      language: s.language,
      status: s.status,
      xpAwarded: s.xpAwarded,
      verdict: s.verdict && {
        status: s.verdict.status,
        passed: s.verdict.passed,
        total: s.verdict.total,
        timeMs: s.verdict.timeMs,
      },
    }));
  },
});

// --- Used by the judging action ---

/** Everything the action needs, including where the hidden tests are. Never public. */
export const loadForJudging = internalQuery({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const submission = await ctx.db.get(submissionId);
    if (!submission || submission.status !== "queued") return null;
    const problem = await ctx.db.get(submission.problemId);
    if (!problem) return null;
    const tests = await ctx.db
      .query("problemTests")
      .withIndex("by_problem_version", (q) =>
        q.eq("problemId", problem._id).eq("version", submission.problemVersion),
      )
      .unique();
    return { submission, problem, testsFile: tests?.file ?? null };
  },
});

export const markRunning = internalMutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    await ctx.db.patch(submissionId, { status: "running" });
  },
});

export const finish = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    verdict: v.optional(verdict),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { submissionId, verdict, error }) => {
    await ctx.db.patch(submissionId, {
      status: verdict ? "done" : "error",
      verdict,
      error,
      finishedAt: Date.now(),
    });

    // Only a Submit counts as a solve; Run judges the examples only.
    const submission = await ctx.db.get(submissionId);
    if (submission?.kind !== "submit" || verdict?.status !== "accepted") return;
    const problem = await ctx.db.get(submission.problemId);
    if (!problem) return;
    const amount = SOLVE_XP[problem.difficulty];
    const { awarded } = await awardXp(ctx, {
      userId: submission.userId,
      key: solveKey(problem.slug, submission.language),
      source: "solve",
      amount,
    });
    if (awarded) await ctx.db.patch(submissionId, { xpAwarded: amount });
  },
});
