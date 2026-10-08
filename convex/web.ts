import { ConvexError, v } from "convex/values";

import { checkSolveBadges } from "./lib/badges";
import { userMutation } from "./lib/functions";
import { recordLessonSolve } from "./lib/learn";
import { isListed } from "./lib/problems";
import { awardXp, SOLVE_XP, solveKey } from "./lib/xp";

const MAX_FILE_BYTES = 64 * 1024;
// A few seconds between Submits, so a loop can't fill the table.
const SUBMIT_COOLDOWN_MS = 3000;

/**
 * Records an HTML and CSS challenge Submit (decisions §17). The browser judged
 * it, so `passed` and `total` are what it reported; an accepted one gives the
 * normal solve XP once (keyed "solve:<slug>:web") and counts for lessons.
 * Practice only: never the daily, weekly, 1v1 or Territory.
 */
export const submit = userMutation({
  args: { slug: v.string(), html: v.string(), css: v.string(), passed: v.number(), total: v.number() },
  handler: async (ctx, { slug, html, css, passed, total }) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!problem || !isListed(problem) || problem.judge.mode !== "web") throw new ConvexError("PROBLEM_NOT_FOUND");
    const encoder = new TextEncoder();
    if (encoder.encode(html).length > MAX_FILE_BYTES || encoder.encode(css).length > MAX_FILE_BYTES) {
      throw new ConvexError("SOURCE_TOO_LONG");
    }
    // Every check runs at every viewport, so that's the only total a real run gives.
    const expected = problem.judge.checks.length * problem.judge.viewports.length;
    if (total !== expected || !Number.isInteger(passed) || passed < 0 || passed > total) {
      throw new ConvexError("BAD_VERDICT");
    }

    const last = await ctx.db
      .query("webSubmissions")
      .withIndex("by_user_problem", (q) => q.eq("userId", ctx.user._id).eq("problemId", problem._id))
      .order("desc")
      .first();
    if (last && Date.now() - last._creationTime < SUBMIT_COOLDOWN_MS) throw new ConvexError("SUBMIT_COOLDOWN");

    const accepted = passed === total;
    const submissionId = await ctx.db.insert("webSubmissions", {
      userId: ctx.user._id,
      problemId: problem._id,
      problemVersion: problem.version,
      html,
      css,
      passed,
      total,
      accepted,
    });
    if (!accepted) return { accepted, xp: null, badges: [], levelReached: null, learn: null };

    const amount = SOLVE_XP[problem.difficulty];
    const xp = await awardXp(ctx, { userId: ctx.user._id, key: solveKey(slug, "web"), source: "solve", amount });
    const badges = [...xp.badges, ...(await checkSolveBadges(ctx, ctx.user._id, problem))];
    const learn = await recordLessonSolve(ctx, ctx.user._id, problem._id);
    if (learn) badges.push(...learn.badges);
    await ctx.db.patch(submissionId, {
      xpAwarded: xp.awarded ? amount : undefined,
      badgesEarned: badges.length ? badges : undefined,
    });
    return {
      accepted,
      xp: (xp.awarded ? amount : 0) + (learn?.xp ?? 0),
      badges,
      levelReached: learn?.levelUp ?? (xp.awarded ? xp.levelUp : undefined) ?? null,
      learn: learn ? { lessons: learn.lessons, modules: learn.modules } : null,
    };
  },
});
