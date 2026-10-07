import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { dailyFor, difficultyForDay, openDaily, settle, streakOf } from "./lib/daily";
import { addDays, dayKey, dayStart } from "./lib/days";
import { getCurrentUserOrNull, publicQuery, userMutation } from "./lib/functions";
import { isListed, unfinishedWeeklyProblems } from "./lib/problems";

// The pick warns in the logs below this many never-used problems.
const LOW_POOL = 14;
const SETTLE_PAGE = 200;
const FASTEST_SHOWN = 20;

// --- Picking (every hour, from crons.ts) ---

/**
 * Picks the day's daily if it isn't picked yet (decisions §15): a never-used
 * problem of the weekday's difficulty, else Medium, else any; with none left,
 * the one used longest ago. Hourly, so a missed run is caught up.
 */
export const pick = internalMutation({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const day = args.day ?? dayKey(Date.now());
    if (await dailyFor(ctx, day)) return null;

    const past = await ctx.db.query("dailyChallenges").collect();
    const lastUsed = new Map(past.map((d) => [d.problemId as string, d.day]));
    const held = await unfinishedWeeklyProblems(ctx, dayStart(day));
    const pool = (await ctx.db.query("problems").collect()).filter((p) => isListed(p) && !held.has(p._id));
    const unused = pool.filter((p) => !lastUsed.has(p._id));

    const wanted = difficultyForDay(day);
    const choices = [
      unused.filter((p) => p.difficulty === wanted),
      unused.filter((p) => p.difficulty === "medium"),
      unused,
    ].find((list) => list.length > 0);

    let problem: Doc<"problems"> | undefined;
    if (choices) {
      problem = choices[Math.floor(Math.random() * choices.length)];
      if (unused.length - 1 < LOW_POOL) {
        console.warn(`daily: only ${unused.length - 1} never-used problems left for the daily`);
      }
    } else {
      problem = pool.sort((a, b) => lastUsed.get(a._id)!.localeCompare(lastUsed.get(b._id)!))[0];
      if (!problem) {
        console.error(`daily: no problem to pick for ${day}`);
        return null;
      }
      console.error(`daily: no never-used problems left; reusing ${problem.slug} for ${day}`);
    }
    await ctx.db.insert("dailyChallenges", { day, problemId: problem._id });
    return problem.slug;
  },
});

// --- Settling streaks (just after midnight UTC, from crons.ts) ---

/**
 * Settles yesterday for every live streak not solved through it: a freeze
 * covers the missed day, or the streak goes to 0.
 */
export const settleStreaks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const yesterday = addDays(dayKey(Date.now()), -1);
    const rows = await ctx.db
      .query("streaks")
      // Live streaks only: a streak at 0 has no coveredThrough.
      .withIndex("by_covered", (q) => q.gte("coveredThrough", "").lt("coveredThrough", yesterday))
      .take(SETTLE_PAGE);
    for (const row of rows) {
      const next = settle(row, yesterday);
      await ctx.db.patch(row._id, { freezes: next.freezes, current: next.current, coveredThrough: next.coveredThrough });
    }
    if (rows.length === SETTLE_PAGE) await ctx.scheduler.runAfter(0, internal.daily.settleStreaks, {});
  },
});

// --- Playing ---

/**
 * Today's daily for the Daily page: the problem, when it resets, and when
 * signed in, the caller's result today and their streak.
 */
export const today = publicQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const day = dayKey(now);
    const daily = await dailyFor(ctx, day);
    const problem = daily && (await ctx.db.get(daily.problemId));
    const user = await getCurrentUserOrNull(ctx);

    let me = null;
    if (user) {
      const result = await ctx.db
        .query("dailyResults")
        .withIndex("by_user_day", (q) => q.eq("userId", user._id).eq("day", day))
        .unique();
      const row = await streakOf(ctx, user._id);
      // As tonight's settle will leave it: a streak with yesterday missed and
      // no freeze to cover it already shows 0.
      const streak = row ? settle(row, addDays(day, -1)) : null;
      me = {
        openedAt: result?.openedAt ?? null,
        solvedAt: result?.solvedAt ?? null,
        timeMs: result?.timeMs ?? null,
        streak: streak?.current ?? 0,
        best: streak?.best ?? 0,
        freezes: streak?.freezes ?? 0,
        totalSolved: streak?.totalSolved ?? 0,
        // Not solved today: the streak needs today's solve, or a freeze tonight.
        atRisk: (streak?.current ?? 0) > 0 && result?.solvedAt === undefined,
      };
    }

    return {
      day,
      endsAt: dayStart(addDays(day, 1)),
      problem: problem
        ? { slug: problem.slug, title: problem.title, difficulty: problem.difficulty, tags: problem.tags }
        : null,
      me,
    };
  },
});

/** Starts the caller's clock on today's daily, when `slug` is it. */
export const open = userMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (problem && isListed(problem)) await openDaily(ctx, ctx.user._id, problem._id, Date.now());
  },
});

/** The fastest solves of a day's daily (today by default), live. */
export const fastest = publicQuery({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const day = args.day ?? dayKey(Date.now());
    const rows = await ctx.db
      .query("dailyResults")
      .withIndex("by_day_time", (q) => q.eq("day", day).gte("timeMs", 0))
      .take(FASTEST_SHOWN);
    return await Promise.all(
      rows.map(async (r, i) => {
        const user = await ctx.db.get(r.userId);
        return {
          rank: i + 1,
          userId: r.userId,
          username: user?.username ?? null,
          name: user?.name ?? "Deleted player",
          imageUrl: user?.imageUrl ?? "",
          timeMs: r.timeMs!,
          language: r.language ?? null,
        };
      }),
    );
  },
});
