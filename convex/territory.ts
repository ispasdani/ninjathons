import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { userMutation, userQuery } from "./lib/functions";
import { problemView } from "./lib/problems";
import { PROVISIONAL_GAMES, tierFor } from "./lib/ratings";
import {
  currentCard,
  JUDGING_GRACE_MS,
  leaveGame,
  openGameOf,
  playersOf,
  regionsOf,
  settleTime,
} from "./lib/territory";
import { buildMap, LEVELS, totalPoints, winningPoints } from "./lib/territoryMap";

// How long after time up a game stops waiting for Submits being judged.
const FINAL_SETTLE_MS = JUDGING_GRACE_MS + 5_000;

const level = v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"));

/** The caller's Territory game that hasn't ended yet, so any page can take them to it. */
export const current = userQuery({
  args: {},
  handler: async (ctx) => {
    const game = await openGameOf(ctx, ctx.user._id);
    return game && { _id: game._id, status: game.status, startsAt: game.startsAt };
  },
});

/**
 * A game for one of its players: the clock, the map with who holds what,
 * every player's standing (counts, never code), the feed, and the caller's
 * current problem at each level once the game is active.
 */
export const get = userQuery({
  // A string, so a mistyped link gets null instead of an error.
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("territoryGames", args.id);
    const game = id && (await ctx.db.get(id));
    if (!game) return null;
    const players = await playersOf(ctx, game._id);
    const me = players.find((p) => p.userId === ctx.user._id);
    if (!me) return null;

    const map = buildMap(game.players);
    const regions = await regionsOf(ctx, game._id);
    const revealed = game.status === "active" || game.status === "finished";
    const problems = revealed
      ? Object.fromEntries(
          await Promise.all(
            LEVELS.map(async (l) => {
              const card = currentCard(game, me, l);
              const problem = card && (await ctx.db.get(card.problemId));
              return [l, problem ? problemView(problem) : null] as const;
            }),
          ),
        )
      : null;
    const events = await ctx.db
      .query("territoryEvents")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .order("desc")
      .take(40);

    return {
      _id: game._id,
      ranked: game.ranked,
      source: game.source,
      status: game.status,
      startsAt: game.startsAt,
      endsAt: game.endsAt,
      timeUp: game.timeUp ?? false,
      finishedAt: game.finishedAt,
      winnerId: game.winnerId,
      reason: game.reason,
      totalPoints: totalPoints(map),
      winningPoints: winningPoints(map),
      regions: map.map((region) => ({
        ...region,
        ownerId: regions[region.index]?.ownerId,
        shieldUntil: regions[region.index]?.shieldUntil,
      })),
      problems,
      // Problems left in each deck after your current one.
      deckLeft: Object.fromEntries(LEVELS.map((l) => [l, Math.max(0, game.decks[l].length - me.deck[l] - 1)])),
      players: await Promise.all(
        players.map(async (p) => {
          const user = await ctx.db.get(p.userId);
          const you = p.userId === ctx.user._id;
          const rating = await ctx.db
            .query("ratings")
            .withIndex("by_user_area", (q) => q.eq("userId", p.userId).eq("area", "territory"))
            .unique();
          // Another player's rating shows only once it's no longer provisional.
          const shown = rating && (you || rating.games >= PROVISIONAL_GAMES) ? Math.round(rating.rating) : null;
          return {
            userId: p.userId,
            you,
            slot: p.slot,
            username: user?.username ?? "Deleted player",
            imageUrl: user?.imageUrl,
            language: p.language,
            rating: shown,
            tier: shown === null ? null : tierFor(shown),
            points: p.points,
            regions: p.regions,
            submits: p.submits,
            left: p.leftAt !== undefined,
            lastSubmitAt: you ? p.lastSubmitAt : undefined,
            place: p.place,
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
        region: e.region,
        fromId: e.fromId,
        passed: e.passed,
        total: e.total,
        accepted: e.accepted,
      })),
    };
  },
});

async function mine(ctx: MutationCtx & { user: Doc<"users"> }, id: Id<"territoryGames">) {
  const game = await ctx.db.get(id);
  const player = game && (await playersOf(ctx, game._id)).find((p) => p.userId === ctx.user._id);
  if (!game || !player) throw new ConvexError("GAME_NOT_FOUND");
  return { game, player };
}

/** Moves on from your current problem at a level, for good. */
export const skip = userMutation({
  args: { id: v.id("territoryGames"), level },
  handler: async (ctx, args) => {
    const { game, player } = await mine(ctx, args.id);
    if (game.status !== "active" || game.timeUp || player.leftAt !== undefined) throw new ConvexError("GAME_OVER");
    if (!currentCard(game, player, args.level)) throw new ConvexError("DECK_EMPTY");
    await ctx.db.patch(player._id, { deck: { ...player.deck, [args.level]: player.deck[args.level] + 1 } });
  },
});

/** Leaves the game: cancelled in the countdown, last place after it. */
export const forfeit = userMutation({
  args: { id: v.id("territoryGames") },
  handler: async (ctx, args) => {
    const { game, player } = await mine(ctx, args.id);
    if (game.status !== "countdown" && game.status !== "active") throw new ConvexError("GAME_OVER");
    if (player.leftAt !== undefined) return;
    await leaveGame(ctx, game, player);
  },
});

// --- Scheduled by createGame ---

/** The countdown is over: the problems become readable. */
export const start = internalMutation({
  args: { gameId: v.id("territoryGames") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (game?.status === "countdown") await ctx.db.patch(gameId, { status: "active" });
  },
});

/** Time is up: no more Submits; the result waits for the ones still being judged. */
export const timeUp = internalMutation({
  args: { gameId: v.id("territoryGames") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (game?.status !== "active") return;
    await ctx.db.patch(gameId, { timeUp: true });
    await settleTime(ctx, gameId);
    await ctx.scheduler.runAfter(FINAL_SETTLE_MS, internal.territory.settleFinal, { gameId });
  },
});

/** Ends a game still waiting on Submits that never came back from judging. */
export const settleFinal = internalMutation({
  args: { gameId: v.id("territoryGames") },
  handler: async (ctx, { gameId }) => {
    await settleTime(ctx, gameId, { final: true });
  },
});
