/**
 * The daily challenge and the streak (decisions §15): one problem per UTC
 * day, solved by an accepted Submit sent that day, timed from when the player
 * first opened it.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { grantBadge, STREAK_BADGES } from "./badges";
import { addDays, dayKey, isoWeekday } from "./days";
import { awardXp } from "./xp";

type Difficulty = Doc<"problems">["difficulty"];

/** Easy Monday and Tuesday, Medium Wednesday to Friday, Hard at the weekend. */
export function difficultyForDay(day: string): Difficulty {
  const weekday = isoWeekday(day);
  return weekday <= 2 ? "easy" : weekday <= 5 ? "medium" : "hard";
}

/** 30, plus 5 per streak day after the first, at most +50. */
export function dailyXp(streak: number) {
  return 30 + Math.min(50, 5 * Math.max(0, streak - 1));
}

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export type StreakState = Pick<Doc<"streaks">, "current" | "best" | "totalSolved" | "freezes" | "coveredThrough">;

export const NO_STREAK: StreakState = { current: 0, best: 0, totalSolved: 0, freezes: 0, coveredThrough: undefined };

/**
 * Brings a streak up to `through` (the day before today): each missed day
 * uses a freeze; with none left, the streak goes to 0.
 */
export function settle(state: StreakState, through: string): StreakState {
  const next = { ...state };
  while (next.coveredThrough !== undefined && next.coveredThrough < through) {
    if (next.freezes === 0) return { ...next, current: 0, coveredThrough: undefined };
    next.freezes--;
    next.coveredThrough = addDays(next.coveredThrough, 1);
  }
  return next;
}

/** The streak after solving `day`'s daily. */
export function solveDay(state: StreakState, day: string): StreakState {
  const settled = settle(state, addDays(day, -1));
  if (settled.coveredThrough === day) return settled;
  const current = settled.coveredThrough === addDays(day, -1) ? settled.current + 1 : 1;
  const earned = current % FREEZE_EVERY === 0 ? 1 : 0;
  return {
    current,
    best: Math.max(settled.best, current),
    totalSolved: settled.totalSolved + 1,
    freezes: Math.min(MAX_FREEZES, settled.freezes + earned),
    coveredThrough: day,
  };
}

/** A day's daily problem, or null before it's picked. */
export async function dailyFor(ctx: QueryCtx, day: string) {
  return await ctx.db
    .query("dailyChallenges")
    .withIndex("by_day", (q) => q.eq("day", day))
    .unique();
}

export async function streakOf(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("streaks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/**
 * Starts the player's clock on today's daily, if `problemId` is it and the
 * clock isn't running yet. Called when the solve page opens and on every
 * Submit, so a solve is always timed.
 */
export async function openDaily(ctx: MutationCtx, userId: Id<"users">, problemId: Id<"problems">, now: number) {
  const day = dayKey(now);
  const daily = await dailyFor(ctx, day);
  if (!daily || daily.problemId !== problemId) return;
  const result = await ctx.db
    .query("dailyResults")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
    .unique();
  if (!result) await ctx.db.insert("dailyResults", { userId, day, openedAt: now });
}

/**
 * Records an accepted Submit as the daily solve, when it was sent on the day
 * its problem was the daily and that day isn't solved yet. Returns what it
 * earned, or null.
 */
export async function recordDailySolve(ctx: MutationCtx, submission: Doc<"submissions">) {
  if (submission.kind !== "submit" || submission.matchId) return null;
  const sentAt = submission._creationTime;
  const day = dayKey(sentAt);
  const daily = await dailyFor(ctx, day);
  if (!daily || daily.problemId !== submission.problemId) return null;

  const result = await ctx.db
    .query("dailyResults")
    .withIndex("by_user_day", (q) => q.eq("userId", submission.userId).eq("day", day))
    .unique();
  if (result?.solvedAt !== undefined) return null;
  const openedAt = result?.openedAt ?? sentAt;
  const solved = { solvedAt: sentAt, timeMs: Math.max(0, sentAt - openedAt), language: submission.language };
  if (result) await ctx.db.patch(result._id, solved);
  else await ctx.db.insert("dailyResults", { userId: submission.userId, day, openedAt, ...solved });

  const row = await streakOf(ctx, submission.userId);
  const before = row ?? NO_STREAK;
  const after = solveDay(before, day);
  const tieBreak = -Date.now();
  if (row) await ctx.db.patch(row._id, { ...after, tieBreak });
  else await ctx.db.insert("streaks", { userId: submission.userId, ...after, tieBreak });

  const amount = dailyXp(after.current);
  const xp = await awardXp(ctx, { userId: submission.userId, key: `daily:${day}`, source: "daily", amount });
  const badges = [...xp.badges];
  for (const days of STREAK_BADGES) {
    if (after.current >= days && (await grantBadge(ctx, submission.userId, `streak-${days}`))) {
      badges.push(`streak-${days}`);
    }
  }
  return {
    xp: xp.awarded ? amount : undefined,
    levelUp: xp.awarded ? xp.levelUp : undefined,
    streak: after.current,
    freezeEarned: after.freezes > settle(before, addDays(day, -1)).freezes || undefined,
    badges,
  };
}
