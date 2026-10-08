/**
 * Leaderboards (roadmap, Progression; decisions §13). Each board ranks players
 * by one value, read in rank order from an index so a rebuild can go page by
 * page. Built now: Level (all time and monthly), 1v1 and Daily; the others
 * come with their phase.
 */
import { v, type Infer } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { levelProgress } from "./levels";
import { PROVISIONAL_GAMES, tierFor } from "./ratings";
import { monthKey } from "./xp";

export const boardKind = v.union(v.literal("level"), v.literal("level-month"), v.literal("1v1"), v.literal("daily"));
export type BoardKind = Infer<typeof boardKind>;

// 1v1 players drop off the board after this long without a game, and come
// back with their next one; their rating doesn't decay (plan, trust rules).
export const INACTIVE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const MONTH = /^\d{4}-\d{2}$/;

/** The stored key of a board: "level", "level-month:2026-10", "1v1" or "daily". */
export function boardKey(kind: BoardKind, month?: string) {
  if (kind !== "level-month") return kind;
  if (month !== undefined && !MONTH.test(month)) throw new Error(`Bad month: ${month}`);
  return `level-month:${month ?? monthKey(Date.now())}`;
}

/** The boards the scheduled rebuild keeps fresh. */
export function liveBoards(now: number) {
  return ["level", `level-month:${monthKey(now)}`, "1v1", "daily"];
}

/** Monthly boards older than last month are deleted; last month's stays. */
export function isRetired(board: string, now: number) {
  if (!board.startsWith("level-month:")) return false;
  const lastMonth = new Date(now);
  lastMonth.setUTCDate(1);
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
  return board.slice("level-month:".length) < monthKey(lastMonth.getTime());
}

export type Entry = { userId: Id<"users">; value: number };

function eligible1v1(row: Doc<"ratings">, now: number) {
  return row.games >= PROVISIONAL_GAMES && now - row.lastGameAt <= INACTIVE_AFTER_MS;
}

/**
 * One page of a board in rank order, best first. Entries a trust rule hides
 * are skipped, so a page can hold fewer than `numItems`.
 */
export async function sourcePage(
  ctx: QueryCtx,
  board: string,
  paginationOpts: { cursor: string | null; numItems: number },
) {
  const now = Date.now();
  if (board === "level") {
    const page = await ctx.db
      .query("users")
      .withIndex("by_xp", (q) => q.gt("xp", 0))
      .order("desc")
      .paginate(paginationOpts);
    return { ...page, page: page.page.map((u): Entry => ({ userId: u._id, value: u.xp ?? 0 })) };
  }
  if (board.startsWith("level-month:")) {
    const month = board.slice("level-month:".length);
    const page = await ctx.db
      .query("xpMonths")
      .withIndex("by_month_xp", (q) => q.eq("month", month))
      .order("desc")
      .paginate(paginationOpts);
    return { ...page, page: page.page.map((m): Entry => ({ userId: m.userId, value: m.xp })) };
  }
  if (board === "1v1") {
    const page = await ctx.db
      .query("ratings")
      .withIndex("by_area_rating", (q) => q.eq("area", "1v1"))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...page,
      page: page.page.filter((r) => eligible1v1(r, now)).map((r): Entry => ({ userId: r.userId, value: r.rating })),
    };
  }
  if (board === "daily") {
    // Current streak, then total dailies solved, then who got there first
    // (decisions §15). Everyone who has solved a daily is on it.
    const page = await ctx.db.query("streaks").withIndex("by_board").order("desc").paginate(paginationOpts);
    return { ...page, page: page.page.map((r): Entry => ({ userId: r.userId, value: r.current })) };
  }
  throw new Error(`Unknown board: ${board}`);
}

/**
 * A group's board, computed live from its members (at most 100). Members with
 * nothing yet on a Level board are listed at 0; 1v1 follows the trust rules.
 */
export async function groupEntries(ctx: QueryCtx, board: string, userIds: Id<"users">[]) {
  const now = Date.now();
  // Sorted by value, then `then` (Daily: total solved), then tieBreak.
  const scored: (Entry & { then?: number; tieBreak: number })[] = [];
  for (const userId of userIds) {
    if (board === "level") {
      const user = await ctx.db.get(userId);
      if (user) scored.push({ userId, value: user.xp ?? 0, tieBreak: user.xpTieBreak ?? -Infinity });
    } else if (board.startsWith("level-month:")) {
      const row = await ctx.db
        .query("xpMonths")
        .withIndex("by_user_month", (q) => q.eq("userId", userId).eq("month", board.slice("level-month:".length)))
        .unique();
      scored.push({ userId, value: row?.xp ?? 0, tieBreak: row?.tieBreak ?? -Infinity });
    } else if (board === "1v1") {
      const row = await ctx.db
        .query("ratings")
        .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", "1v1"))
        .unique();
      if (row && eligible1v1(row, now)) scored.push({ userId, value: row.rating, tieBreak: -row.lastGameAt });
    } else if (board === "daily") {
      const row = await ctx.db
        .query("streaks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      if (row) scored.push({ userId, value: row.current, then: row.totalSolved, tieBreak: row.tieBreak });
    } else {
      throw new Error(`Unknown board: ${board}`);
    }
  }
  scored.sort((a, b) => b.value - a.value || (b.then ?? 0) - (a.then ?? 0) || b.tieBreak - a.tieBreak);
  return scored.map(({ userId, value }, i) => ({ userId, value, rank: i + 1 }));
}

/** A ranked row as players see it. */
export async function presentRow(
  ctx: QueryCtx,
  board: string,
  row: { userId: Id<"users">; value: number; rank: number },
) {
  const user = await ctx.db.get(row.userId);
  const value = Math.round(row.value);
  const { level, title } = levelProgress(user?.xp ?? 0);
  const base = {
    rank: row.rank,
    userId: row.userId,
    username: user?.username ?? null,
    name: user?.name ?? "Deleted player",
    imageUrl: user?.imageUrl ?? "",
    country: user?.country ?? null,
    value,
    // Level boards show level and title; 1v1 shows the tier.
    ...(board === "1v1" ? { tier: tierFor(value) } : { level, title }),
  };
  if (board !== "daily") return base;
  // The Daily board's second column: total dailies solved.
  const streak = await ctx.db
    .query("streaks")
    .withIndex("by_user", (q) => q.eq("userId", row.userId))
    .unique();
  return { ...base, totalSolved: streak?.totalSolved ?? 0 };
}
