/**
 * Ratings per area (decisions §13). They show skill, can go down and never mix
 * with XP. Only internal mutations call these, so no client can set a rating.
 */
import type { Infer } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { ratingArea } from "../schemas/ratings";
import { DEFAULT_GLICKO, rate } from "./glicko2";

export type RatingArea = Infer<typeof ratingArea>;

// A rating is provisional, and hidden from leaderboards and other players,
// until this many ranked games (plan, Leaderboards: trust rules).
export const PROVISIONAL_GAMES = 10;

// Placeholder names and cut-offs (design.md 2.5).
const TIERS = [
  { from: -Infinity, tier: "Newbie" },
  { from: 1200, tier: "Apprentice" },
  { from: 1400, tier: "Specialist" },
  { from: 1600, tier: "Expert" },
  { from: 1900, tier: "Master" },
  { from: 2200, tier: "Grandmaster" },
] as const;

export type Tier = (typeof TIERS)[number]["tier"];

export function tierFor(rating: number): Tier {
  let tier: Tier = TIERS[0].tier;
  for (const band of TIERS) if (rating >= band.from) tier = band.tier;
  return tier;
}

/** What a player may see of a rating row; the Glicko details stay inside. */
export function ratingSummary(row: Doc<"ratings">) {
  const rating = Math.round(row.rating);
  return {
    area: row.area,
    rating,
    tier: tierFor(rating),
    provisional: row.games < PROVISIONAL_GAMES,
    games: row.games,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
  };
}

async function current(ctx: MutationCtx, userId: Id<"users">, area: RatingArea) {
  return await ctx.db
    .query("ratings")
    .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", area))
    .unique();
}

/**
 * Rates one ranked 1v1 game: `score` is 1 if `a` won, 0 if `b` won, 0.5 for a
 * draw. Both players are rated from their ratings before the game. Callers
 * decide whether a game counts at all (ranked, pair limits: phase 4).
 */
export async function recordDuel(
  ctx: MutationCtx,
  game: { a: Id<"users">; b: Id<"users">; score: 0 | 0.5 | 1 },
) {
  if (game.a === game.b) throw new Error("A player can't be rated against themselves");
  const now = Date.now();
  const sides = [
    { userId: game.a, opponentId: game.b, score: game.score },
    { userId: game.b, opponentId: game.a, score: (1 - game.score) as 0 | 0.5 | 1 },
  ];
  const rows = await Promise.all(sides.map((s) => current(ctx, s.userId, "1v1")));
  const before = rows.map((row) => (row ? { rating: row.rating, rd: row.rd, volatility: row.volatility } : DEFAULT_GLICKO));

  const changes = [];
  for (const [i, side] of sides.entries()) {
    const next = rate(before[i], [{ opponent: before[1 - i], score: side.score }]);
    const row = rows[i];
    const record = {
      games: (row?.games ?? 0) + 1,
      wins: (row?.wins ?? 0) + (side.score === 1 ? 1 : 0),
      losses: (row?.losses ?? 0) + (side.score === 0 ? 1 : 0),
      draws: (row?.draws ?? 0) + (side.score === 0.5 ? 1 : 0),
    };
    const fields = { ...next, ...record, lastGameAt: now };
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("ratings", { userId: side.userId, area: "1v1", ...fields });

    const change = next.rating - before[i].rating;
    await ctx.db.insert("ratingHistory", {
      userId: side.userId,
      area: "1v1",
      rating: next.rating,
      change,
      opponentId: side.opponentId,
    });
    changes.push({ userId: side.userId, rating: next.rating, change });
  }
  return changes;
}
