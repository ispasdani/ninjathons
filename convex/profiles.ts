/**
 * Public profiles (decisions §18): everything here is public by design, so
 * only what the profile shows leaves the server. Never email, code, groups,
 * doc views or unfinished games.
 */
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type QueryCtx } from "./_generated/server";
import { BADGES } from "./lib/badges";
import { addDays, dayKey, isoWeekday } from "./lib/days";
import { getPlan, publicQuery } from "./lib/functions";
import { levelProgress } from "./lib/levels";
import { PROVISIONAL_GAMES, tierFor, type RatingArea } from "./lib/ratings";
import { usernameKey } from "./lib/usernames";

// The activity grid: 26 weeks, Monday to Sunday (decisions §18).
export const ACTIVITY_WEEKS = 26;
const RECENT_GAMES = 10;
const HISTORY_POINTS = 60;

/** The user behind a username, or the new username when it's an old one still held for its owner. */
async function findUser(ctx: QueryCtx, username: string) {
  const key = usernameKey(username);
  const user = await ctx.db
    .query("users")
    .withIndex("by_usernameKey", (q) => q.eq("usernameKey", key))
    .unique();
  if (user) return { user };
  // An old username redirects for its 90 days (§1); a deleted account's has no owner.
  const reservations = await ctx.db
    .query("usernameReservations")
    .withIndex("by_usernameKey", (q) => q.eq("usernameKey", key))
    .collect();
  const now = Date.now();
  for (const held of reservations) {
    if (held.expiresAt <= now || !held.userId) continue;
    const owner = await ctx.db.get(held.userId);
    if (owner?.username) return { redirect: owner.username };
  }
  return null;
}

async function rating(ctx: QueryCtx, userId: Id<"users">, area: RatingArea) {
  const row = await ctx.db
    .query("ratings")
    .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", area))
    .unique();
  if (!row) return null;
  // Hidden while provisional (plan, trust rules); the games left are shown instead.
  const trusted = row.games >= PROVISIONAL_GAMES;
  const value = Math.round(row.rating);
  return {
    rating: trusted ? value : null,
    tier: trusted ? tierFor(value) : null,
    games: row.games,
    placementLeft: trusted ? 0 : PROVISIONAL_GAMES - row.games,
    record: { wins: row.wins, losses: row.losses, draws: row.draws },
  };
}

async function levelRank(ctx: QueryCtx, userId: Id<"users">) {
  const versions = await ctx.db
    .query("leaderboardVersions")
    .withIndex("by_board", (q) => q.eq("board", "level"))
    .unique();
  if (versions?.live === undefined) return null;
  const row = await ctx.db
    .query("leaderboardSnapshots")
    .withIndex("by_board_user", (q) => q.eq("board", "level").eq("version", versions.live!).eq("userId", userId))
    .unique();
  return row?.rank ?? null;
}

/** Problems solved, in any language: the distinct slugs of the solve entries in the ledger. */
async function solvedCount(ctx: QueryCtx, userId: Id<"users">) {
  const entries = await ctx.db
    .query("xpLedger")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).gte("key", "solve:").lt("key", "solve;"))
    .collect();
  return new Set(entries.map((e) => e.key.split(":")[1])).size;
}

async function badges(ctx: QueryCtx, userId: Id<"users">) {
  const earned = new Map(
    (
      await ctx.db
        .query("userBadges")
        .withIndex("by_user_badge", (q) => q.eq("userId", userId))
        .collect()
    ).map((b) => [b.badgeId, b._creationTime]),
  );
  const all = BADGES.map((b) => ({ id: b.id, group: b.group, name: b.name, description: b.description, earnedAt: earned.get(b.id) ?? null }));
  // Earned first, newest first; then locked, in the list's order.
  return [
    ...all.filter((b) => b.earnedAt !== null).sort((a, b) => b.earnedAt! - a.earnedAt!),
    ...all.filter((b) => b.earnedAt === null),
  ];
}

/** The first day of the grid: the Monday ACTIVITY_WEEKS - 1 weeks before this week's. */
export function activityStart(now: number) {
  const today = dayKey(now);
  return addDays(today, -(isoWeekday(today) - 1) - 7 * (ACTIVITY_WEEKS - 1));
}

async function activity(ctx: QueryCtx, userId: Id<"users">, now: number) {
  const from = activityStart(now);
  const rows = await ctx.db
    .query("activityDays")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).gte("day", from))
    .collect();
  return { from, today: dayKey(now), days: Object.fromEntries(rows.map((r) => [r.day, r.count])) };
}

async function ratingHistory(ctx: QueryCtx, userId: Id<"users">, trusted: boolean) {
  if (!trusted) return [];
  const rows = await ctx.db
    .query("ratingHistory")
    .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", "1v1"))
    .order("desc")
    .take(HISTORY_POINTS);
  return rows.reverse().map((r) => ({ at: r._creationTime, rating: Math.round(r.rating) }));
}

type Recent =
  | {
      kind: "1v1";
      id: Id<"matches">;
      finishedAt: number;
      ranked: boolean;
      result: "win" | "loss" | "draw";
      opponent: string | null;
      ghost: boolean;
      problem: string | null;
      ratingChange: number | null;
    }
  | {
      kind: "territory";
      id: Id<"territoryGames">;
      finishedAt: number;
      ranked: boolean;
      place: number;
      players: number;
      ratingChange: number | null;
    };

/** The last finished 1v1 and Territory games, newest first. Ghost runs of this player in others' matches don't count. */
async function recentGames(ctx: QueryCtx, user: Doc<"users">, trusted: { duel: boolean; territory: boolean }) {
  const games: Recent[] = [];
  const duels = await ctx.db
    .query("matchPlayers")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(RECENT_GAMES * 2);
  for (const row of duels) {
    if (row.ghost || !row.result) continue;
    const match = await ctx.db.get(row.matchId);
    if (!match || match.status !== "finished" || match.finishedAt === undefined) continue;
    const other = (
      await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect()
    ).find((p) => p._id !== row._id);
    const opponent = other ? await ctx.db.get(other.userId) : null;
    const problem = await ctx.db.get(match.problemId);
    games.push({
      kind: "1v1",
      id: match._id,
      finishedAt: match.finishedAt,
      ranked: match.ranked,
      result: row.result,
      opponent: opponent?.username ?? null,
      ghost: other?.ghost ?? false,
      problem: problem?.title ?? null,
      ratingChange: trusted.duel && row.counted && row.ratingChange !== undefined ? Math.round(row.ratingChange) : null,
    });
  }
  const territory = await ctx.db
    .query("territoryPlayers")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(RECENT_GAMES * 2);
  for (const row of territory) {
    if (row.place === undefined) continue;
    const game = await ctx.db.get(row.gameId);
    if (!game || game.status !== "finished" || game.finishedAt === undefined) continue;
    games.push({
      kind: "territory",
      id: game._id,
      finishedAt: game.finishedAt,
      ranked: game.ranked,
      place: row.place,
      players: game.players,
      ratingChange: trusted.territory && row.counted && row.ratingChange !== undefined ? Math.round(row.ratingChange) : null,
    });
  }
  return games.sort((a, b) => b.finishedAt - a.finishedAt).slice(0, RECENT_GAMES);
}

/**
 * A profile by username. `redirect` when it's an old username still held for
 * its owner; null when nobody has it.
 */
export const get = publicQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const found = await findUser(ctx, username);
    if (!found) return null;
    if ("redirect" in found) return { redirect: found.redirect } as const;
    const { user } = found;
    if (!user.username) return null;

    const now = Date.now();
    const [duel, territory, streak] = await Promise.all([
      rating(ctx, user._id, "1v1"),
      rating(ctx, user._id, "territory"),
      ctx.db
        .query("streaks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique(),
    ]);
    const { tier } = await getPlan(ctx, user);

    return {
      redirect: null,
      username: user.username,
      name: user.name,
      imageUrl: user.imageUrl,
      country: user.country ?? null,
      joinedAt: user._creationTime,
      pro: tier !== "free",
      level: levelProgress(user.xp ?? 0),
      stats: {
        duel,
        territory,
        levelRank: await levelRank(ctx, user._id),
        solved: await solvedCount(ctx, user._id),
        streak: { current: streak?.current ?? 0, best: streak?.best ?? 0 },
      },
      badges: await badges(ctx, user._id),
      activity: await activity(ctx, user._id, now),
      ratingHistory: await ratingHistory(ctx, user._id, duel?.rating != null),
      recent: await recentGames(ctx, user, { duel: duel?.rating != null, territory: territory?.rating != null }),
    };
  },
});

/**
 * Rebuilds one player's activity days from their accepted Submits and
 * finished lessons, for activity from before the counter existed (9 Oct
 * 2026). Run by hand: `npx convex run profiles:backfillActivity '{"username":"…"}'`.
 */
export const backfillActivity = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_usernameKey", (q) => q.eq("usernameKey", usernameKey(username)))
      .unique();
    if (!user) throw new Error(`no user ${username}`);
    const counts = new Map<string, number>();
    const add = (time: number) => counts.set(dayKey(time), (counts.get(dayKey(time)) ?? 0) + 1);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of submissions) {
      if (s.kind === "submit" && s.verdict?.status === "accepted") add(s.finishedAt ?? s._creationTime);
    }
    const web = await ctx.db
      .query("webSubmissions")
      .withIndex("by_user_problem", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of web) if (s.accepted) add(s._creationTime);
    const lessons = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_lesson", (q) => q.eq("userId", user._id))
      .collect();
    for (const l of lessons) if (l.finishedAt !== undefined) add(l.finishedAt);

    const old = await ctx.db
      .query("activityDays")
      .withIndex("by_user_day", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of old) await ctx.db.delete(row._id);
    for (const [day, count] of counts) await ctx.db.insert("activityDays", { userId: user._id, day, count });
    return { days: counts.size, total: [...counts.values()].reduce((a, b) => a + b, 0) };
  },
});
