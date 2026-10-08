import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { problemLanguages } from "./judge/languages";
import { userMutation, userQuery } from "./lib/functions";
import { checkSolveBadges } from "./lib/badges";
import { openDaily, recordDailySolve } from "./lib/daily";
import { recordLessonSolve } from "./lib/learn";
import { isListed } from "./lib/problems";
import { openWeekly, recordWeeklySolve } from "./lib/weekly";
import { noteSubmit, playersOf, recordJudgedSubmit, SUBMIT_COOLDOWN_MS } from "./lib/matches";
import { checkTerritorySubmit, noteTerritorySubmit, recordTerritorySubmit } from "./lib/territory";
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
    // Sent from the duel screen: the match's problem, while the match is on.
    matchId: v.optional(v.id("matches")),
    // Sent from the Territory screen: the game, and the region the Submit means to take.
    territory: v.optional(v.object({ gameId: v.id("territoryGames"), region: v.number() })),
  },
  handler: async (ctx, { slug, language, source, kind, matchId, territory }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!problem || !isListed(problem)) throw new ConvexError("PROBLEM_NOT_FOUND");

    let player: Doc<"matchPlayers"> | undefined;
    let problemVersion = problem.version;
    if (matchId) {
      const match = await ctx.db.get(matchId);
      player = match ? (await playersOf(ctx, matchId)).find((p) => p.userId === ctx.user._id) : undefined;
      if (!match || !player || match.problemId !== problem._id) throw new ConvexError("MATCH_NOT_FOUND");
      if (match.status !== "active" || match.timeUp || Date.now() >= match.endsAt) throw new ConvexError("MATCH_OVER");
      if (kind === "submit" && player.lastSubmitAt && Date.now() - player.lastSubmitAt < SUBMIT_COOLDOWN_MS) {
        throw new ConvexError("SUBMIT_COOLDOWN");
      }
      // Both players are judged on the tests the match started with.
      problemVersion = match.problemVersion;
    }
    let territoryPlayer: Doc<"territoryPlayers"> | undefined;
    if (territory) {
      if (matchId) throw new ConvexError("GAME_NOT_FOUND");
      const checked = await checkTerritorySubmit(ctx, {
        ...territory,
        userId: ctx.user._id,
        problemId: problem._id,
        kind,
      });
      territoryPlayer = checked.player;
      // Every player is judged on the tests the game was dealt with.
      problemVersion = checked.version;
    }
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
      problemVersion,
      language,
      source,
      kind,
      status: "queued",
      matchId,
      territoryGameId: territory?.gameId,
      region: territory?.region,
    });
    if (player && kind === "submit") await noteSubmit(ctx, player);
    if (territoryPlayer && kind === "submit") await noteTerritorySubmit(ctx, territoryPlayer);
    // A Submit to the daily or a weekly problem starts its clock if the page didn't.
    if (!matchId && !territory && kind === "submit") {
      await openDaily(ctx, ctx.user._id, problem._id, Date.now());
      await openWeekly(ctx, ctx.user._id, problem._id, Date.now());
    }
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

export const setWaiting = internalMutation({
  args: { submissionId: v.id("submissions"), waiting: v.boolean() },
  handler: async (ctx, { submissionId, waiting }) => {
    await ctx.db.patch(submissionId, { waitingForRunner: waiting || undefined });
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
      waitingForRunner: undefined,
    });

    // Only a Submit counts as a solve; Run judges the examples only.
    const submission = await ctx.db.get(submissionId);
    if (submission?.kind !== "submit") return;
    if (submission.matchId) await recordJudgedSubmit(ctx, submission);
    if (submission.territoryGameId) await recordTerritorySubmit(ctx, submission);
    if (verdict?.status !== "accepted") return;
    const problem = await ctx.db.get(submission.problemId);
    if (!problem) return;
    const amount = SOLVE_XP[problem.difficulty];
    const xp = await awardXp(ctx, {
      userId: submission.userId,
      key: solveKey(problem.slug, submission.language),
      source: "solve",
      amount,
    });
    const badges = [...xp.badges, ...(await checkSolveBadges(ctx, submission.userId, problem))];
    const daily = await recordDailySolve(ctx, submission);
    if (daily) badges.push(...daily.badges);
    const weekly = await recordWeeklySolve(ctx, submission, problem);
    if (weekly) badges.push(...weekly.badges);
    const learn = await recordLessonSolve(ctx, submission.userId, problem._id);
    if (learn) badges.push(...learn.badges);
    await ctx.db.patch(submissionId, {
      xpAwarded: xp.awarded ? amount : undefined,
      // The highest level any of this Submit's awards reached: the last one to cross a level.
      levelReached: learn?.levelUp ?? weekly?.levelUp ?? daily?.levelUp ?? (xp.awarded ? xp.levelUp : undefined),
      badgesEarned: badges.length ? badges : undefined,
      daily: daily ? { xp: daily.xp, streak: daily.streak, freezeEarned: daily.freezeEarned } : undefined,
      weekly: weekly ? { points: weekly.points, xp: weekly.xp, setComplete: weekly.setComplete } : undefined,
      learn: learn ? { lessons: learn.lessons, modules: learn.modules, xp: learn.xp } : undefined,
    });
  },
});
