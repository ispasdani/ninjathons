import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { grantBadge } from "./lib/badges";
import { isoWeekday, dayKey, previousWeek, weekKey, weekStart } from "./lib/days";
import { getCurrentUserOrNull, publicQuery, userMutation } from "./lib/functions";
import { isListed } from "./lib/problems";
import { openWeekly, setFor, topCount, WEEKLY_POINTS, WEEKLY_PROBLEM_XP, WEEKLY_SET_XP } from "./lib/weekly";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// --- Seeding (npm run problems:seed, through `npx convex run`) ---

/**
 * Inserts or updates a set from weekly/<slug>/set.json. Its problems must be
 * seeded first. While the set hasn't started they're unreleased; a set that
 * has started keeps its problems, so a running week can't change under
 * players.
 */
export const seedSet = internalMutation({
  args: {
    slug: v.string(),
    title: v.string(),
    theme: v.string(),
    order: v.number(),
    problems: v.array(v.string()),
  },
  handler: async (ctx, { slug, title, theme, order, problems }) => {
    const problemIds: Id<"problems">[] = [];
    for (const problemSlug of problems) {
      const problem = await ctx.db
        .query("problems")
        .withIndex("by_slug", (q) => q.eq("slug", problemSlug))
        .unique();
      if (!problem) throw new Error(`${slug}: problem ${problemSlug} isn't seeded`);
      problemIds.push(problem._id);
    }

    const existing = await ctx.db
      .query("weeklySets")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing?.week !== undefined) {
      await ctx.db.patch(existing._id, { title, theme });
      return { created: false, started: true };
    }
    if (existing) {
      // Problems taken out of the set go back to the library.
      for (const id of existing.problemIds) if (!problemIds.includes(id)) await ctx.db.patch(id, { unreleased: undefined });
      await ctx.db.patch(existing._id, { title, theme, order, problemIds });
    } else {
      await ctx.db.insert("weeklySets", { slug, title, theme, order, problemIds });
    }
    for (const id of problemIds) await ctx.db.patch(id, { unreleased: true });
    return { created: !existing, started: false };
  },
});

// --- Starting and settling (hourly, from crons.ts) ---

/**
 * On Mondays (UTC), starts the next unstarted set as this week's, releasing
 * its problems, and settles last week. Hourly, so a missed run is caught up
 * the same day. `force` starts a set on any day, for trying it out on dev.
 */
export const start = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const now = Date.now();
    const week = weekKey(now);

    const last = await setFor(ctx, previousWeek(week));
    if (last && !last.settled) await ctx.scheduler.runAfter(0, internal.weekly.settle, { setId: last._id });

    if (await setFor(ctx, week)) return null;
    if (!force && isoWeekday(dayKey(now)) !== 1) return null;
    const next = (await ctx.db.query("weeklySets").withIndex("by_order").collect()).find((s) => s.week === undefined);
    if (!next) {
      // Once per Monday: the first hour, or a forced start.
      if (force || new Date(now).getUTCHours() === 0) console.error(`weekly: no set left to start for ${week}`);
      return null;
    }
    await ctx.db.patch(next._id, { week });
    for (const id of next.problemIds) await ctx.db.patch(id, { unreleased: undefined });
    return next.slug;
  },
});

/** Grants the Weekly top 10% badge for a finished week, once. */
export const settle = internalMutation({
  args: { setId: v.id("weeklySets") },
  handler: async (ctx, { setId }) => {
    const set = await ctx.db.get(setId);
    if (!set?.week || set.settled) return;
    // Every row has at least one solve, so every row is a player with points.
    // Fine for the beta's numbers; page through it past a few thousand players.
    const rows = await ctx.db
      .query("weeklyResults")
      .withIndex("by_week_board", (q) => q.eq("week", set.week!))
      .order("desc")
      .collect();
    for (const row of rows.slice(0, topCount(rows.length))) await grantBadge(ctx, row.userId, "weekly-top-10");
    await ctx.db.patch(setId, { settled: true });
  },
});

// --- Playing ---

/**
 * This week's set for the Weekly page: theme, problems with their points,
 * when it ends, and when signed in, the caller's progress and total.
 */
export const current = publicQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const week = weekKey(now);
    const set = await setFor(ctx, week);
    const user = await getCurrentUserOrNull(ctx);
    const endsAt = weekStart(week) + WEEK_MS;
    if (!set) return { week, endsAt, set: null, me: null };

    const problems = [];
    for (const id of set.problemIds) {
      const problem = await ctx.db.get(id);
      if (!problem || !isListed(problem)) continue;
      const progress = user
        ? await ctx.db
            .query("weeklyProgress")
            .withIndex("by_user_week", (q) => q.eq("userId", user._id).eq("week", week).eq("problemId", id))
            .unique()
        : null;
      problems.push({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        points: WEEKLY_POINTS[problem.difficulty],
        openedAt: progress?.openedAt ?? null,
        solvedAt: progress?.solvedAt ?? null,
        timeMs: progress?.solvedAt !== undefined ? progress.solvedAt - progress.openedAt : null,
      });
    }

    const result = user
      ? await ctx.db
          .query("weeklyResults")
          .withIndex("by_user_week", (q) => q.eq("userId", user._id).eq("week", week))
          .unique()
      : null;
    return {
      week,
      endsAt,
      set: {
        title: set.title,
        theme: set.theme,
        problems,
        maxPoints: problems.reduce((sum, p) => sum + p.points, 0),
        xp: { perProblem: WEEKLY_PROBLEM_XP, fullSet: WEEKLY_SET_XP },
      },
      me: user ? { points: result?.points ?? 0, timeMs: result?.timeMs ?? 0, solved: result?.solved ?? 0 } : null,
    };
  },
});

/** Starts the caller's clock on a problem of this week's set, when `slug` is one. */
export const open = userMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (problem && isListed(problem)) await openWeekly(ctx, ctx.user._id, problem._id, Date.now());
  },
});
