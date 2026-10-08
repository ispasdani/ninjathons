import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalizeCode, randomCode } from "./lib/codes";
import { userMutation, userQuery } from "./lib/functions";
import { membership } from "./lib/groups";
import { openMatchOf } from "./lib/matches";
import { PROVISIONAL_GAMES } from "./lib/ratings";
import { createGame, leave1v1Queue, leaveTerritoryWaiting, openGameOf } from "./lib/territory";
import { MAX_PLAYERS, MIN_PLAYERS } from "./lib/territoryMap";
import { language } from "./schemas/problems";

// A lobby waits this long for its host to start it.
export const LOBBY_TTL_MS = 15 * 60_000;
// The lobby page pings every 10 s; players not seen for this long are left out at the start.
export const LOBBY_STALE_MS = 30_000;
// Ranked lobbies: everyone past their provisional games and within this spread (decisions §16).
export const RANKED_MAX_SPREAD = 400;

function isOpen(lobby: Doc<"territoryLobbies">, now: number) {
  return lobby.status === "open" && lobby.expiresAt > now;
}

async function byCode(ctx: QueryCtx, code: string) {
  return await ctx.db
    .query("territoryLobbies")
    .withIndex("by_code", (q) => q.eq("code", normalizeCode(code)))
    .unique();
}

async function seatsOf(ctx: QueryCtx, lobbyId: Id<"territoryLobbies">) {
  return await ctx.db
    .query("territoryLobbyPlayers")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .collect();
}

async function busy(ctx: QueryCtx, userId: Id<"users">) {
  return (await openMatchOf(ctx, userId)) !== null || (await openGameOf(ctx, userId)) !== null;
}

/** Why these players can't start a ranked game, or null if they can. */
async function rankedProblem(ctx: QueryCtx, userIds: Id<"users">[]) {
  const ratings = [];
  for (const userId of userIds) {
    const row = await ctx.db
      .query("ratings")
      .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", "territory"))
      .unique();
    if (!row || row.games < PROVISIONAL_GAMES) return "TERRITORY_NEEDS_GAMES";
    ratings.push(row.rating);
  }
  if (Math.max(...ratings) - Math.min(...ratings) >= RANKED_MAX_SPREAD) return "RATING_SPREAD";
  return null;
}

/** Takes a seat, leaving any other queue or lobby first. */
async function sit(ctx: MutationCtx, lobbyId: Id<"territoryLobbies">, userId: Id<"users">, lang: Doc<"territoryLobbyPlayers">["language"]) {
  await leave1v1Queue(ctx, userId);
  await leaveTerritoryWaiting(ctx, userId);
  await ctx.db.insert("territoryLobbyPlayers", { lobbyId, userId, language: lang, lastSeenAt: Date.now() });
}

/**
 * Opens a lobby, for a group when `groupId` is given (members only). Returns
 * its code for the link.
 */
export const create = userMutation({
  args: { ranked: v.boolean(), language, groupId: v.optional(v.id("groups")) },
  handler: async (ctx, args) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    if (await busy(ctx, ctx.user._id)) throw new ConvexError("ALREADY_IN_MATCH");
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || group.deletedAt !== undefined || !(await membership(ctx, group._id, ctx.user._id))) {
        throw new ConvexError("GROUP_NOT_FOUND");
      }
    }
    let code = randomCode();
    while (await byCode(ctx, code)) code = randomCode();
    // Out of anything else first: as the host of an older lobby, that closes it.
    await leave1v1Queue(ctx, ctx.user._id);
    await leaveTerritoryWaiting(ctx, ctx.user._id);
    const lobbyId = await ctx.db.insert("territoryLobbies", {
      hostId: ctx.user._id,
      code,
      groupId: args.groupId,
      ranked: args.ranked,
      status: "open",
      expiresAt: Date.now() + LOBBY_TTL_MS,
    });
    await sit(ctx, lobbyId, ctx.user._id, args.language);
    return code;
  },
});

/**
 * A lobby for its page: the host, the settings, who's in, and what stops the
 * caller joining or the host starting. Anyone signed in with the link sees it.
 */
export const get = userQuery({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const lobby = await byCode(ctx, code);
    if (!lobby) return null;
    const now = Date.now();
    const seats = await seatsOf(ctx, lobby._id);
    const inLobby = seats.some((s) => s.userId === ctx.user._id);
    const group = lobby.groupId ? await ctx.db.get(lobby.groupId) : null;
    const players = await Promise.all(
      seats.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return {
          userId: s.userId,
          username: user?.username ?? "Deleted player",
          imageUrl: user?.imageUrl,
          language: s.language,
          host: s.userId === lobby.hostId,
          you: s.userId === ctx.user._id,
          away: now - s.lastSeenAt > LOBBY_STALE_MS,
        };
      }),
    );

    let problem: string | null = null;
    if (lobby.status === "started") problem = "STARTED";
    else if (!isOpen(lobby, now)) problem = "LOBBY_CLOSED";
    else if (!inLobby && seats.length >= MAX_PLAYERS) problem = "LOBBY_FULL";
    let startProblem: string | null = null;
    if (!problem && lobby.hostId === ctx.user._id) {
      const present = seats.filter((s) => now - s.lastSeenAt <= LOBBY_STALE_MS);
      if (present.length < MIN_PLAYERS) startProblem = "NOT_ENOUGH_PLAYERS";
      else if (lobby.ranked) startProblem = await rankedProblem(ctx, present.map((s) => s.userId));
    }
    return {
      _id: lobby._id,
      code: lobby.code,
      ranked: lobby.ranked,
      status: isOpen(lobby, now) ? "open" : lobby.status === "started" ? "started" : "closed",
      expiresAt: lobby.expiresAt,
      group: group && group.deletedAt === undefined ? { _id: group._id, name: group.name } : null,
      host: players.find((p) => p.host)?.username ?? null,
      isHost: lobby.hostId === ctx.user._id,
      inLobby,
      players,
      // Only the players who were in it are sent to the game.
      gameId: lobby.gameId && (inLobby || (await isPlayer(ctx, lobby.gameId, ctx.user._id))) ? lobby.gameId : null,
      problem,
      startProblem,
    };
  },
});

async function isPlayer(ctx: QueryCtx, gameId: Id<"territoryGames">, userId: Id<"users">) {
  const rows = await ctx.db
    .query("territoryPlayers")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
  return rows.some((r) => r.userId === userId);
}

/** Joins a lobby by its code, or changes language if already in it. */
export const join = userMutation({
  args: { code: v.string(), language },
  handler: async (ctx, args) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    const lobby = await byCode(ctx, args.code);
    if (!lobby) throw new ConvexError("LOBBY_NOT_FOUND");
    if (!isOpen(lobby, Date.now())) throw new ConvexError("LOBBY_CLOSED");
    const seats = await seatsOf(ctx, lobby._id);
    const mine = seats.find((s) => s.userId === ctx.user._id);
    if (mine) {
      await ctx.db.patch(mine._id, { language: args.language, lastSeenAt: Date.now() });
      return;
    }
    if (seats.length >= MAX_PLAYERS) throw new ConvexError("LOBBY_FULL");
    if (await busy(ctx, ctx.user._id)) throw new ConvexError("ALREADY_IN_MATCH");
    await sit(ctx, lobby._id, ctx.user._id, args.language);
  },
});

/** Leaves a lobby; the host leaving closes it. */
export const leave = userMutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const lobby = await byCode(ctx, code);
    if (!lobby) return;
    const mine = (await seatsOf(ctx, lobby._id)).find((s) => s.userId === ctx.user._id);
    if (!mine) return;
    await ctx.db.delete(mine._id);
    if (lobby.hostId === ctx.user._id && lobby.status === "open") await ctx.db.patch(lobby._id, { status: "closed" });
  },
});

/** Sent every 10 s by the lobby page while it's open. */
export const heartbeat = userMutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const lobby = await byCode(ctx, code);
    if (!lobby) return;
    const mine = (await seatsOf(ctx, lobby._id)).find((s) => s.userId === ctx.user._id);
    if (mine) await ctx.db.patch(mine._id, { lastSeenAt: Date.now() });
  },
});

/**
 * The host starts the game with the 3 to 6 players present; anyone away for
 * 30 seconds is left out. Ranked lobbies check the limits now.
 */
export const start = userMutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const lobby = await byCode(ctx, code);
    if (!lobby || lobby.hostId !== ctx.user._id) throw new ConvexError("LOBBY_NOT_FOUND");
    const now = Date.now();
    if (!isOpen(lobby, now)) throw new ConvexError("LOBBY_CLOSED");
    const seats = await seatsOf(ctx, lobby._id);
    const present = [];
    for (const seat of seats) {
      if (now - seat.lastSeenAt > LOBBY_STALE_MS) continue;
      if (await busy(ctx, seat.userId)) throw new ConvexError("PLAYER_IN_MATCH");
      present.push(seat);
    }
    if (present.length < MIN_PLAYERS) throw new ConvexError("NOT_ENOUGH_PLAYERS");
    if (lobby.ranked) {
      const problem = await rankedProblem(ctx, present.map((s) => s.userId));
      if (problem) throw new ConvexError(problem);
    }
    const gameId = await createGame(ctx, {
      players: present.map((s) => ({ userId: s.userId, language: s.language })),
      ranked: lobby.ranked,
      source: "lobby",
    });
    if (!gameId) throw new ConvexError("NO_PROBLEMS");
    await ctx.db.patch(lobby._id, { status: "started", gameId });
    return gameId;
  },
});

/** The caller's lobby, if they're in an open one, so Play can take them back to it. */
export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const seat = await ctx.db
      .query("territoryLobbyPlayers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .first();
    const lobby = seat && (await ctx.db.get(seat.lobbyId));
    if (!lobby || !isOpen(lobby, Date.now())) return null;
    return { code: lobby.code, isHost: lobby.hostId === ctx.user._id };
  },
});

/** A group's open lobbies, for its members on the group page. */
export const ofGroup = userQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    if (!(await membership(ctx, groupId, ctx.user._id))) return [];
    const now = Date.now();
    const lobbies = await ctx.db
      .query("territoryLobbies")
      .withIndex("by_group_status", (q) => q.eq("groupId", groupId).eq("status", "open"))
      .collect();
    return await Promise.all(
      lobbies
        .filter((l) => isOpen(l, now))
        .map(async (l) => {
          const host = await ctx.db.get(l.hostId);
          return {
            code: l.code,
            ranked: l.ranked,
            host: host?.username ?? "Deleted player",
            players: (await seatsOf(ctx, l._id)).length,
            expiresAt: l.expiresAt,
          };
        }),
    );
  },
});
