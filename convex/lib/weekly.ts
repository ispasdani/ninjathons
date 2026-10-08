/**
 * The weekly challenge (decisions §15): a themed set of 3 to 5 new problems,
 * Monday to Sunday UTC. Points per problem by difficulty; less total time
 * breaks ties; each problem is timed from when the player first opened it.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { weekKey } from "./days";
import { awardXp } from "./xp";

export const WEEKLY_POINTS: Record<Doc<"problems">["difficulty"], number> = {
  easy: 100,
  medium: 200,
  hard: 400,
};
export const WEEKLY_PROBLEM_XP = 25;
export const WEEKLY_SET_XP = 100;
// The share of a week's players who earn the Weekly top 10% badge.
export const TOP_SHARE = 0.1;

/** The set running in `week`, or null. */
export async function setFor(ctx: QueryCtx, week: string) {
  return await ctx.db
    .query("weeklySets")
    .withIndex("by_week", (q) => q.eq("week", week))
    .unique();
}

/** How many players earn the top 10% badge out of `players`, rounded up. */
export function topCount(players: number) {
  return Math.ceil(players * TOP_SHARE);
}

/**
 * Starts the player's clock on a problem of this week's set, if `problemId`
 * is one and the clock isn't running yet.
 */
export async function openWeekly(ctx: MutationCtx, userId: Id<"users">, problemId: Id<"problems">, now: number) {
  const week = weekKey(now);
  const set = await setFor(ctx, week);
  if (!set?.problemIds.includes(problemId)) return;
  const progress = await ctx.db
    .query("weeklyProgress")
    .withIndex("by_user_week", (q) => q.eq("userId", userId).eq("week", week).eq("problemId", problemId))
    .unique();
  if (!progress) await ctx.db.insert("weeklyProgress", { userId, week, problemId, openedAt: now });
}

/**
 * Records an accepted Submit as a weekly solve, when it was sent during the
 * week its problem's set ran and that problem isn't solved yet. Returns what
 * it earned, or null.
 */
export async function recordWeeklySolve(ctx: MutationCtx, submission: Doc<"submissions">, problem: Doc<"problems">) {
  if (submission.kind !== "submit" || submission.matchId) return null;
  const sentAt = submission._creationTime;
  const week = weekKey(sentAt);
  const set = await setFor(ctx, week);
  if (!set?.problemIds.includes(problem._id)) return null;

  const { userId } = submission;
  const progress = await ctx.db
    .query("weeklyProgress")
    .withIndex("by_user_week", (q) => q.eq("userId", userId).eq("week", week).eq("problemId", problem._id))
    .unique();
  if (progress?.solvedAt !== undefined) return null;
  const points = WEEKLY_POINTS[problem.difficulty];
  const openedAt = progress?.openedAt ?? sentAt;
  const timeMs = Math.max(0, sentAt - openedAt);
  if (progress) await ctx.db.patch(progress._id, { solvedAt: sentAt, points });
  else await ctx.db.insert("weeklyProgress", { userId, week, problemId: problem._id, openedAt, solvedAt: sentAt, points });

  const result = await ctx.db
    .query("weeklyResults")
    .withIndex("by_user_week", (q) => q.eq("userId", userId).eq("week", week))
    .unique();
  const total = {
    points: (result?.points ?? 0) + points,
    timeMs: (result?.timeMs ?? 0) + timeMs,
    solved: (result?.solved ?? 0) + 1,
  };
  if (result) await ctx.db.patch(result._id, { ...total, tieBreak: -total.timeMs });
  else await ctx.db.insert("weeklyResults", { userId, week, ...total, tieBreak: -total.timeMs });

  const perProblem = await awardXp(ctx, {
    userId,
    key: `weekly:${week}:${problem.slug}`,
    source: "weekly",
    amount: WEEKLY_PROBLEM_XP,
  });
  const setComplete = total.solved === set.problemIds.length;
  const bonus = setComplete
    ? await awardXp(ctx, { userId, key: `weekly:${week}:set`, source: "weekly", amount: WEEKLY_SET_XP })
    : null;
  const xp = (perProblem.awarded ? WEEKLY_PROBLEM_XP : 0) + (bonus?.awarded ? WEEKLY_SET_XP : 0);
  return {
    points,
    xp: xp || undefined,
    setComplete: setComplete || undefined,
    levelUp: (bonus?.awarded ? bonus.levelUp : undefined) ?? (perProblem.awarded ? perProblem.levelUp : undefined),
    badges: [...perProblem.badges, ...(bonus?.badges ?? [])],
  };
}
