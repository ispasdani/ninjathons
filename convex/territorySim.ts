/**
 * Bots for playing whole Territory games on the dev deployment (npm run
 * territory:sim): bot accounts, a lobby started like a host's Start, Submits
 * judged in the real runner, and a teardown that removes every trace.
 * Internal, so only the CLI can call these.
 */
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { randomCode } from "./lib/codes";
import {
  checkTerritorySubmit,
  currentCard,
  noteTerritorySubmit,
  openGameOf,
  playersOf,
  regionsOf,
} from "./lib/territory";
import { buildMap, LEVELS, winningPoints } from "./lib/territoryMap";
import { language } from "./schemas/problems";
import { startLobby } from "./territoryLobbies";

const BOT_PREFIX = "sim_territory_";
const LANGUAGES = ["python", "javascript"] as const;

function botClerkId(i: number) {
  return `${BOT_PREFIX}${i}`;
}

/** Makes (or reuses) the bots, seats them in a lobby hosted by the first, and starts it. */
export const setup = internalMutation({
  args: { players: v.number(), ranked: v.boolean() },
  handler: async (ctx, { players, ranked }) => {
    const userIds: Id<"users">[] = [];
    for (let i = 1; i <= players; i++) {
      const clerkId = botClerkId(i);
      let user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
      if (!user) {
        const id = await ctx.db.insert("users", {
          clerkId,
          email: `${clerkId}@example.invalid`,
          name: `Sim bot ${i}`,
          imageUrl: "",
          username: `simbot${i}`,
          usernameKey: `simbot${i}`,
        });
        user = (await ctx.db.get(id))!;
      }
      if (await openGameOf(ctx, user._id)) throw new Error(`simbot${i} is still in a game; run the teardown`);
      userIds.push(user._id);
    }
    const now = Date.now();
    const lobbyId = await ctx.db.insert("territoryLobbies", {
      hostId: userIds[0],
      code: randomCode(),
      ranked,
      status: "open",
      expiresAt: now + 60_000,
    });
    for (const [i, userId] of userIds.entries()) {
      await ctx.db.insert("territoryLobbyPlayers", { lobbyId, userId, language: LANGUAGES[i % 2], lastSeenAt: now });
    }
    const gameId = await startLobby(ctx, (await ctx.db.get(lobbyId))!);
    return { gameId, userIds };
  },
});

/** Everything the bots need to play their next move. */
export const state = internalQuery({
  args: { gameId: v.id("territoryGames") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) return null;
    const players = await playersOf(ctx, gameId);
    const regions = await regionsOf(ctx, gameId);
    const now = Date.now();
    return {
      status: game.status,
      reason: game.reason,
      timeUp: game.timeUp ?? false,
      startsAt: game.startsAt,
      endsAt: game.endsAt,
      winningPoints: winningPoints(buildMap(game.players)),
      now,
      regions: regions.map((r) => ({ owner: r.ownerId as string | undefined, shieldUntil: r.shieldUntil })),
      players: await Promise.all(
        players.map(async (p) => {
          const user = await ctx.db.get(p.userId);
          const inFlight = await ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", p.userId))
            .order("desc")
            .first();
          const cards: Record<string, string | null> = {};
          for (const level of LEVELS) {
            const card = currentCard(game, p, level);
            cards[level] = card ? ((await ctx.db.get(card.problemId))?.slug ?? null) : null;
          }
          return {
            userId: p.userId as string,
            username: user?.username ?? "?",
            language: p.language,
            points: p.points,
            regions: p.regions,
            submits: p.submits,
            place: p.place,
            lastSubmitAt: p.lastSubmitAt,
            busy: inFlight !== null && (inFlight.status === "queued" || inFlight.status === "running"),
            cards,
          };
        }),
      ),
    };
  },
});

/** A bot's Submit: the same checks as submissions.create, then judging. */
export const submit = internalMutation({
  args: {
    gameId: v.id("territoryGames"),
    userId: v.id("users"),
    region: v.number(),
    slug: v.string(),
    language,
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!problem) throw new Error(`no problem ${args.slug}`);
    const checked = await checkTerritorySubmit(ctx, {
      gameId: args.gameId,
      region: args.region,
      userId: args.userId,
      problemId: problem._id,
      kind: "submit",
    });
    const submissionId = await ctx.db.insert("submissions", {
      userId: args.userId,
      problemId: problem._id,
      problemVersion: checked.version,
      language: args.language,
      source: args.source,
      kind: "submit",
      status: "queued",
      territoryGameId: args.gameId,
      region: args.region,
    });
    await noteTerritorySubmit(ctx, checked.player);
    await ctx.scheduler.runAfter(0, internal.judging.judge, { submissionId });
    return submissionId;
  },
});

/** The bots' games, lobbies and Submits, before their accounts go. */
export const clearGames = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (let i = 1; i <= 6; i++) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", botClerkId(i)))
        .unique();
      if (!user) continue;
      const rows = await ctx.db
        .query("territoryPlayers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const row of rows) {
        const gameId = row.gameId;
        if (!(await ctx.db.get(gameId))) continue;
        const tables = [
          await ctx.db.query("territoryRegions").withIndex("by_game_index", (q) => q.eq("gameId", gameId)).collect(),
          await ctx.db.query("territoryEvents").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect(),
          await ctx.db.query("territoryPlayers").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect(),
          await ctx.db.query("submissions").withIndex("by_territory_game", (q) => q.eq("territoryGameId", gameId)).collect(),
        ];
        for (const table of tables) for (const doc of table) await ctx.db.delete(doc._id);
        await ctx.db.delete(gameId);
      }
      const hosted = await ctx.db.query("territoryLobbies").collect();
      for (const lobby of hosted) {
        if (lobby.hostId !== user._id) continue;
        const seats = await ctx.db
          .query("territoryLobbyPlayers")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
          .collect();
        for (const seat of seats) await ctx.db.delete(seat._id);
        await ctx.db.delete(lobby._id);
      }
      // Practice Submits too, if any were made.
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const s of submissions) await ctx.db.delete(s._id);
    }
  },
});

/** Removes the bots' accounts the way account deletion does, and frees their names. */
export const clearReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (let i = 1; i <= 6; i++) {
      const rows = await ctx.db
        .query("usernameReservations")
        .withIndex("by_usernameKey", (q) => q.eq("usernameKey", `simbot${i}`))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
  },
});

export const teardown = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.territorySim.clearGames, {});
    for (let i = 1; i <= 6; i++) await ctx.runMutation(internal.user.deleteFromClerk, { clerkId: botClerkId(i) });
    await ctx.runMutation(internal.territorySim.clearReservations, {});
  },
});
