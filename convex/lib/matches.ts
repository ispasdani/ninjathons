/**
 * The 1v1 match engine (decisions §14). Matches are made by matchmaking or a
 * challenge, run on the server clock, and end on the first accepted Submit,
 * a forfeit, or time up. Only internal mutations call these.
 */
import type { Infer } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Language } from "../judge/types";
import type { difficulty } from "../schemas/problems";
import { checkMatchBadges } from "./badges";
import { DEFAULT_GLICKO } from "./glicko2";
import { isListed } from "./problems";
import { recordDuel } from "./ratings";
import { awardXp } from "./xp";

type Difficulty = Infer<typeof difficulty>;

// From match made to problem shown, so both players' pages can open it.
export const COUNTDOWN_MS = 10_000;
// Wrong Submits cost nothing, but each player waits this long between them.
export const SUBMIT_COOLDOWN_MS = 10_000;
// How long a match runs, by the problem's difficulty.
export const MATCH_TIME_MS: Record<Difficulty, number> = {
  easy: 15 * 60_000,
  medium: 25 * 60_000,
  hard: 40 * 60_000,
};
// Only this many ranked games between the same two players per UTC day change
// ratings and give match XP (roadmap, XP sources and ranked challenges).
export const PAIR_GAMES_PER_DAY = 3;
// Ranked games only, within the pair limit. A win gives 25 in all, not 10 + 25.
export const MATCH_XP = { played: 10, won: 25 };
// Submits still being judged after this long are treated as lost, so a crashed
// judging action can't hold a match open.
const JUDGING_GRACE_MS = 2 * 60_000;
// Until the approved ranked pool exists (before the closed beta), matches draw
// from every published problem.
const MATCH_POOL: Doc<"problems">["status"][] = ["beta", "approved"];

/** The problem difficulty for two players' average 1v1 rating. */
export function difficultyForRating(rating: number): Difficulty {
  if (rating < 1400) return "easy";
  if (rating <= 1900) return "medium";
  return "hard";
}

export async function currentRating(ctx: QueryCtx, userId: Id<"users">) {
  const row = await ctx.db
    .query("ratings")
    .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", "1v1"))
    .unique();
  return row?.rating ?? DEFAULT_GLICKO.rating;
}

/** Slugs the user has solved in any language, from their solve XP entries. */
export async function solvedSlugs(ctx: QueryCtx, userId: Id<"users">) {
  const entries = await ctx.db
    .query("xpLedger")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).gte("key", "solve:").lt("key", "solve;"))
    .collect();
  return new Set(entries.map((e) => e.key.split(":")[1]));
}

/**
 * A problem of the given difficulty that no player has solved. Falls back to
 * an unsolved problem of another difficulty, then to any of the difficulty.
 */
export async function pickProblem(ctx: QueryCtx, userIds: Id<"users">[], wanted: Difficulty) {
  const pool: Doc<"problems">[] = [];
  for (const status of MATCH_POOL) {
    const rows = await ctx.db.query("problems").withIndex("by_status", (q) => q.eq("status", status)).collect();
    pool.push(...rows.filter(isListed));
  }
  const solved = new Set<string>();
  for (const userId of userIds) for (const slug of await solvedSlugs(ctx, userId)) solved.add(slug);
  const unsolved = pool.filter((p) => !solved.has(p.slug));
  const choices = [
    unsolved.filter((p) => p.difficulty === wanted),
    unsolved,
    pool.filter((p) => p.difficulty === wanted),
    pool,
  ].find((list) => list.length > 0);
  if (!choices) return null;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Makes a match between two players and schedules its start and time up.
 * The difficulty follows their average rating unless given. Returns null when
 * there is no problem to play.
 */
export async function createMatch(
  ctx: MutationCtx,
  game: {
    players: { userId: Id<"users">; language: Language }[];
    ranked: boolean;
    source: Doc<"matches">["source"];
    difficulty?: Difficulty;
  },
) {
  const ratings = await Promise.all(game.players.map((p) => currentRating(ctx, p.userId)));
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  const problem = await pickProblem(
    ctx,
    game.players.map((p) => p.userId),
    game.difficulty ?? difficultyForRating(average),
  );
  if (!problem) return null;

  const startsAt = Date.now() + COUNTDOWN_MS;
  const endsAt = startsAt + MATCH_TIME_MS[problem.difficulty];
  const matchId = await ctx.db.insert("matches", {
    mode: "1v1",
    ranked: game.ranked,
    source: game.source,
    status: "countdown",
    problemId: problem._id,
    problemVersion: problem.version,
    difficulty: problem.difficulty,
    startsAt,
    endsAt,
  });
  for (const [i, player] of game.players.entries()) {
    // Out of the queue, however this match was made.
    const queued = await ctx.db
      .query("matchQueue")
      .withIndex("by_user", (q) => q.eq("userId", player.userId))
      .unique();
    if (queued) await ctx.db.delete(queued._id);
    // And their other challenges are off: they're busy now.
    const sent = await ctx.db
      .query("challenges")
      .withIndex("by_from_status", (q) => q.eq("fromId", player.userId).eq("status", "pending"))
      .collect();
    for (const c of sent) await ctx.db.patch(c._id, { status: "cancelled" });
    await ctx.db.insert("matchPlayers", {
      matchId,
      userId: player.userId,
      language: player.language,
      ratingBefore: ratings[i],
      submits: 0,
      bestPassed: 0,
      total: 0,
    });
  }
  await ctx.scheduler.runAt(startsAt, internal.matches.start, { matchId });
  await ctx.scheduler.runAt(endsAt, internal.matches.timeUp, { matchId });
  return matchId;
}

export async function playersOf(ctx: QueryCtx, matchId: Id<"matches">) {
  return await ctx.db
    .query("matchPlayers")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
}

/** The user's match that hasn't ended yet, if any. */
export async function openMatchOf(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("matchPlayers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(5);
  for (const row of rows) {
    // A ghost row is someone else racing your recording, not your match.
    if (row.ghost) continue;
    const match = await ctx.db.get(row.matchId);
    if (match && (match.status === "countdown" || match.status === "active")) return match;
  }
  return null;
}

/** Counts a Submit as it is sent: the opponent sees the count right away. */
export async function noteSubmit(ctx: MutationCtx, player: Doc<"matchPlayers">) {
  await ctx.db.patch(player._id, { submits: player.submits + 1, lastSubmitAt: Date.now() });
}

/**
 * A judged Submit of a match: updates the player's best and the feed, then
 * checks whether the match is decided. A runner error has no verdict and only
 * re-checks, since that Submit no longer holds the result back.
 */
export async function recordJudgedSubmit(ctx: MutationCtx, submission: Doc<"submissions">) {
  if (!submission.matchId) return;
  const match = await ctx.db.get(submission.matchId);
  if (match?.status !== "active") return;
  const verdict = submission.verdict;
  if (verdict) {
    const player = (await playersOf(ctx, match._id)).find((p) => p.userId === submission.userId);
    if (!player) return;
    const accepted = verdict.status === "accepted";
    const sentAt = submission._creationTime;
    await ctx.db.patch(player._id, {
      total: verdict.total,
      ...(verdict.passed > player.bestPassed ? { bestPassed: verdict.passed, bestAt: sentAt } : {}),
      ...(accepted && (player.solvedAt === undefined || sentAt < player.solvedAt) ? { solvedAt: sentAt } : {}),
    });
    await ctx.db.insert("matchEvents", {
      matchId: match._id,
      userId: submission.userId,
      kind: "submit",
      passed: verdict.passed,
      total: verdict.total,
      accepted,
    });
  }
  await settle(ctx, match._id);
}

/**
 * Ends the match when its result is known. The earliest-sent accepted Submit
 * wins, so a slower compile doesn't lose a race: while the opponent has an
 * earlier Submit still being judged, the result waits for it. At time up,
 * the best Submit wins (most tests, then sent first); otherwise a draw.
 * `final` stops waiting for Submits that never came back.
 */
export async function settle(ctx: MutationCtx, matchId: Id<"matches">, opts: { final?: boolean } = {}) {
  const match = await ctx.db.get(matchId);
  if (match?.status !== "active") return;
  const players = await playersOf(ctx, matchId);

  const now = Date.now();
  const pending = opts.final
    ? []
    : (
        await ctx.db
          .query("submissions")
          .withIndex("by_match", (q) => q.eq("matchId", matchId))
          .collect()
      ).filter(
        (s) =>
          s.kind === "submit" &&
          (s.status === "queued" || s.status === "running") &&
          now - s._creationTime < JUDGING_GRACE_MS,
      );

  const solvers = players
    .filter((p) => p.solvedAt !== undefined)
    .sort((a, b) => a.solvedAt! - b.solvedAt!);
  if (solvers.length > 0) {
    const first = solvers[0];
    if (pending.some((s) => s.userId !== first.userId && s._creationTime < first.solvedAt!)) return;
    await finishMatch(ctx, match, players, { winnerId: first.userId, reason: "solved" });
    return;
  }

  if (!match.timeUp) return;
  if (pending.some((s) => s._creationTime <= match.endsAt)) return;
  const ranked = players
    .filter((p) => p.bestPassed > 0)
    .sort((a, b) => b.bestPassed - a.bestPassed || a.bestAt! - b.bestAt!);
  const [best, next] = ranked;
  const decided = best && (!next || next.bestPassed < best.bestPassed || next.bestAt! > best.bestAt!);
  await finishMatch(ctx, match, players, { winnerId: decided ? best.userId : undefined, reason: "time" });
}

/** Ranked games between two players since the start of today (UTC) that changed ratings. */
async function countedToday(ctx: QueryCtx, a: Id<"users">, b: Id<"users">) {
  const dayStart = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const history = await ctx.db
    .query("ratingHistory")
    .withIndex("by_user_area", (q) => q.eq("userId", a).eq("area", "1v1").gte("_creationTime", dayStart))
    .collect();
  return history.filter((h) => h.opponentId === b).length;
}

/** Whether the loser of the match had at some point passed more tests than the winner. */
async function wasComeback(ctx: QueryCtx, matchId: Id<"matches">, winnerId: Id<"users">) {
  const events = await ctx.db
    .query("matchEvents")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
  let mine = 0;
  let theirs = 0;
  for (const e of events) {
    if (e.kind !== "submit" || e.passed === undefined) continue;
    if (e.userId === winnerId) mine = Math.max(mine, e.passed);
    else theirs = Math.max(theirs, e.passed);
    if (theirs > mine) return true;
  }
  return false;
}

/**
 * Writes the result. A ranked game within the daily pair limit changes both
 * ratings and gives match XP; badges are checked for both players.
 */
export async function finishMatch(
  ctx: MutationCtx,
  match: Doc<"matches">,
  players: Doc<"matchPlayers">[],
  outcome: { winnerId?: Id<"users">; reason: "solved" | "time" | "forfeit" },
) {
  await ctx.db.patch(match._id, {
    status: "finished",
    finishedAt: Date.now(),
    winnerId: outcome.winnerId,
    reason: outcome.reason,
  });

  const [a, b] = players;
  const counted =
    match.ranked && a && b && (await countedToday(ctx, a.userId, b.userId)) < PAIR_GAMES_PER_DAY;
  const changes =
    counted && a && b
      ? await recordDuel(ctx, {
          a: a.userId,
          b: b.userId,
          score: outcome.winnerId === a.userId ? 1 : outcome.winnerId === b.userId ? 0 : 0.5,
        })
      : [];
  const comeback = outcome.winnerId ? await wasComeback(ctx, match._id, outcome.winnerId) : false;

  for (const player of players) {
    // A ghost has no account in this match: nothing to award.
    if (player.ghost) continue;
    const result = !outcome.winnerId ? "draw" : outcome.winnerId === player.userId ? "win" : "loss";
    const change = changes.find((c) => c.userId === player.userId);
    let xpAwarded: number | undefined;
    const badges: string[] = [];
    if (counted) {
      const amount = result === "win" ? MATCH_XP.won : MATCH_XP.played;
      const xp = await awardXp(ctx, {
        userId: player.userId,
        key: `match1v1:${match._id}`,
        source: "match1v1",
        amount,
      });
      if (xp.awarded) xpAwarded = amount;
      badges.push(...xp.badges);
    }
    badges.push(
      ...(await checkMatchBadges(ctx, player.userId, {
        rankedWin: match.ranked && result === "win",
        comeback: result === "win" && comeback,
        rating: change,
      })),
    );
    await ctx.db.patch(player._id, {
      result,
      counted: Boolean(counted),
      ratingChange: change?.change,
      xpAwarded,
      badgesEarned: badges.length ? badges : undefined,
    });
  }
}
