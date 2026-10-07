import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { userMutation, userQuery } from "./lib/functions";
import { finishMatch, openMatchOf, playersOf, settle } from "./lib/matches";
import { problemView } from "./lib/problems";
import { PROVISIONAL_GAMES, tierFor } from "./lib/ratings";

// How long after time up a match stops waiting for Submits being judged.
const FINAL_SETTLE_MS = 2 * 60_000 + 5_000;

/** The caller's match that hasn't ended yet, so any page can take them to it. */
export const current = userQuery({
  args: {},
  handler: async (ctx) => {
    const match = await openMatchOf(ctx, ctx.user._id);
    return match && { _id: match._id, status: match.status, startsAt: match.startsAt };
  },
});

/**
 * A match for one of its players: the clock, both players' progress (counts,
 * never code) and the feed. The problem is only included once the match is
 * active, so nobody sees it during the countdown.
 */
export const get = userQuery({
  args: { id: v.id("matches") },
  handler: async (ctx, { id }) => {
    const match = await ctx.db.get(id);
    if (!match) return null;
    const players = await playersOf(ctx, id);
    if (!players.some((p) => p.userId === ctx.user._id)) return null;

    const revealed = match.status === "active" || match.status === "finished";
    const problem = revealed ? await ctx.db.get(match.problemId) : null;
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", id))
      .order("desc")
      .take(30);

    return {
      _id: match._id,
      ranked: match.ranked,
      source: match.source,
      status: match.status,
      difficulty: match.difficulty,
      startsAt: match.startsAt,
      endsAt: match.endsAt,
      timeUp: match.timeUp ?? false,
      finishedAt: match.finishedAt,
      winnerId: match.winnerId,
      reason: match.reason,
      problem: problem && problemView(problem),
      players: await Promise.all(
        players.map(async (p) => {
          const user = await ctx.db.get(p.userId);
          const you = p.userId === ctx.user._id;
          const rating = await ctx.db
            .query("ratings")
            .withIndex("by_user_area", (q) => q.eq("userId", p.userId).eq("area", "1v1"))
            .unique();
          // Another player's rating shows only once it's no longer provisional.
          const shown = rating && (you || rating.games >= PROVISIONAL_GAMES) ? Math.round(rating.rating) : null;
          return {
            userId: p.userId,
            you,
            username: user?.username ?? "Deleted player",
            imageUrl: user?.imageUrl,
            language: p.language,
            rating: shown,
            tier: shown === null ? null : tierFor(shown),
            submits: p.submits,
            bestPassed: p.bestPassed,
            total: p.total,
            solved: p.solvedAt !== undefined,
            lastSubmitAt: you ? p.lastSubmitAt : undefined,
            result: p.result,
            counted: p.counted,
            ratingChange: p.ratingChange === undefined ? undefined : Math.round(p.ratingChange),
            xpAwarded: you ? p.xpAwarded : undefined,
            badgesEarned: you ? p.badgesEarned : undefined,
          };
        }),
      ),
      events: events.map((e) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        userId: e.userId,
        kind: e.kind,
        passed: e.passed,
        total: e.total,
        accepted: e.accepted,
      })),
    };
  },
});

/**
 * Gives up. During the countdown the match is cancelled with no result, since
 * nobody has seen the problem; once it's active the opponent wins.
 */
export const forfeit = userMutation({
  args: { id: v.id("matches") },
  handler: async (ctx, { id }) => {
    const match = await ctx.db.get(id);
    const players = match ? await playersOf(ctx, id) : [];
    if (!match || !players.some((p) => p.userId === ctx.user._id)) throw new ConvexError("MATCH_NOT_FOUND");
    if (match.status === "countdown") {
      await ctx.db.patch(id, { status: "cancelled", reason: "cancelled", finishedAt: Date.now() });
      return;
    }
    if (match.status !== "active") throw new ConvexError("MATCH_OVER");
    await ctx.db.insert("matchEvents", { matchId: id, userId: ctx.user._id, kind: "forfeit" });
    const opponent = players.find((p) => p.userId !== ctx.user._id);
    await finishMatch(ctx, match, players, { winnerId: opponent?.userId, reason: "forfeit" });
  },
});

// --- Scheduled by createMatch ---

/** The countdown is over: the problem becomes readable. */
export const start = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (match?.status === "countdown") await ctx.db.patch(matchId, { status: "active" });
  },
});

/** Time is up: no more Submits; the result waits for the ones still being judged. */
export const timeUp = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (match?.status !== "active") return;
    await ctx.db.patch(matchId, { timeUp: true });
    await settle(ctx, matchId);
    await ctx.scheduler.runAfter(FINAL_SETTLE_MS, internal.matches.settleFinal, { matchId });
  },
});

/** Ends a match still waiting on Submits that never came back from judging. */
export const settleFinal = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    await settle(ctx, matchId, { final: true });
  },
});
