/**
 * Ghost races (decisions §14): race a recorded real solve from a finished
 * match when nobody is in the queue. The recording is the times and counts of
 * that player's Submits, replayed by the server; never code. Always unranked.
 */
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Language } from "../judge/types";
import { COUNTDOWN_MS, currentRating, MATCH_TIME_MS, solvedSlugs } from "./matches";
import { isListed } from "./problems";

// How many recent finished matches to look through for a recording.
const SEARCH_MATCHES = 200;
// Pick at random among this many recordings closest to the player's rating.
const CLOSEST = 5;

export type Recording = {
  match: Doc<"matches">;
  player: Doc<"matchPlayers">;
  steps: { afterMs: number; passed: number; total: number; accepted: boolean }[];
};

/**
 * A recorded solve by someone else, closest to the player's rating, of a
 * problem the player hasn't solved if there is one. Null when there's none.
 */
export async function findRecording(ctx: QueryCtx, userId: Id<"users">): Promise<Recording | null> {
  const rating = await currentRating(ctx, userId);
  const solved = await solvedSlugs(ctx, userId);
  const finished = await ctx.db
    .query("matches")
    .withIndex("by_status", (q) => q.eq("status", "finished"))
    .order("desc")
    .take(SEARCH_MATCHES);

  const found: { match: Doc<"matches">; player: Doc<"matchPlayers">; unsolved: boolean }[] = [];
  for (const match of finished) {
    if (match.source === "ghost") continue;
    const problem = await ctx.db.get(match.problemId);
    if (!problem || !isListed(problem)) continue;
    const players = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();
    for (const player of players) {
      if (player.ghost || player.solvedAt === undefined || player.userId === userId) continue;
      // The recording is labelled with its player's name, so they must still exist.
      const owner = await ctx.db.get(player.userId);
      if (!owner?.username) continue;
      found.push({ match, player, unsolved: !solved.has(problem.slug) });
    }
  }
  if (found.length === 0) return null;

  const pool = found.some((f) => f.unsolved) ? found.filter((f) => f.unsolved) : found;
  pool.sort((a, b) => Math.abs(a.player.ratingBefore - rating) - Math.abs(b.player.ratingBefore - rating));
  const pick = pool[Math.floor(Math.random() * Math.min(CLOSEST, pool.length))];

  const events = await ctx.db
    .query("matchEvents")
    .withIndex("by_match", (q) => q.eq("matchId", pick.match._id))
    .collect();
  const steps = events
    .filter((e) => e.userId === pick.player.userId && e.kind === "submit" && e.passed !== undefined)
    .map((e) => ({
      afterMs: Math.max(0, e._creationTime - pick.match.startsAt),
      passed: e.passed!,
      total: e.total!,
      accepted: e.accepted ?? false,
    }));
  return { match: pick.match, player: pick.player, steps };
}

/** Makes an unranked race against a recording and schedules each of its Submits. */
export async function createGhostMatch(
  ctx: MutationCtx,
  game: { userId: Id<"users">; language: Language; recording: Recording },
) {
  const { recording } = game;
  const startsAt = Date.now() + COUNTDOWN_MS;
  const endsAt = startsAt + MATCH_TIME_MS[recording.match.difficulty];
  const matchId = await ctx.db.insert("matches", {
    mode: "1v1",
    ranked: false,
    source: "ghost",
    status: "countdown",
    problemId: recording.match.problemId,
    problemVersion: recording.match.problemVersion,
    difficulty: recording.match.difficulty,
    startsAt,
    endsAt,
  });
  const queued = await ctx.db
    .query("matchQueue")
    .withIndex("by_user", (q) => q.eq("userId", game.userId))
    .unique();
  if (queued) await ctx.db.delete(queued._id);
  await ctx.db.insert("matchPlayers", {
    matchId,
    userId: game.userId,
    language: game.language,
    ratingBefore: await currentRating(ctx, game.userId),
    submits: 0,
    bestPassed: 0,
    total: 0,
  });
  await ctx.db.insert("matchPlayers", {
    matchId,
    userId: recording.player.userId,
    language: recording.player.language,
    ratingBefore: recording.player.ratingBefore,
    ghost: true,
    submits: 0,
    bestPassed: 0,
    total: 0,
  });
  await ctx.scheduler.runAt(startsAt, internal.matches.start, { matchId });
  await ctx.scheduler.runAt(endsAt, internal.matches.timeUp, { matchId });
  for (const step of recording.steps) {
    await ctx.scheduler.runAt(startsAt + step.afterMs, internal.ghosts.step, {
      matchId,
      passed: step.passed,
      total: step.total,
      accepted: step.accepted,
    });
  }
  return matchId;
}
