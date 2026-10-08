/**
 * The Territory engine (decisions §16). Games are made from a lobby or the
 * queue, run on the server clock, and end on a majority, time up, or when
 * everyone else has left. Only internal mutations and the guarded public
 * functions call these.
 */
import { ConvexError } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Language } from "../judge/types";
import { checkTerritoryBadges } from "./badges";
import { isListed } from "./problems";
import { DEFAULT_OPENSKILL } from "./openskill";
import { recordTerritory } from "./ratings";
import {
  atLeast,
  buildMap,
  checkTake,
  type Level,
  LEVELS,
  placements,
  type RegionState,
  SHIELD_MS,
  winningPoints,
} from "./territoryMap";
import { awardXp } from "./xp";

export const COUNTDOWN_MS = 10_000;
export const GAME_TIME_MS = 30 * 60_000;
export const SUBMIT_COOLDOWN_MS = 10_000;
// Problems dealt per difficulty, when the library has that many.
export const DECK_SIZE: Record<Level, number> = { easy: 8, medium: 8, hard: 5 };
// Ranked games only, within the pair limit. 1st and 2nd replace the 15, not add to it.
export const TERRITORY_XP = { played: 15, first: 40, second: 20 };
// A ranked game is unrated if any two of its players already had this many counted games together today.
export const PAIR_GAMES_PER_DAY = 3;
// Submits still being judged after this long are treated as lost.
export const JUDGING_GRACE_MS = 2 * 60_000;
// Until the approved ranked pool exists, games draw from every published problem.
const GAME_POOL: Doc<"problems">["status"][] = ["beta", "approved"];

type Card = Doc<"territoryGames">["decks"]["easy"][number];

function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function solvedSlugs(ctx: QueryCtx, userId: Id<"users">) {
  const entries = await ctx.db
    .query("xpLedger")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).gte("key", "solve:").lt("key", "solve;"))
    .collect();
  return new Set(entries.map((e) => e.key.split(":")[1]));
}

/** One deck per difficulty: problems no player has solved first, each part shuffled. */
async function dealDecks(ctx: QueryCtx, userIds: Id<"users">[]) {
  const pool: Doc<"problems">[] = [];
  for (const status of GAME_POOL) {
    const rows = await ctx.db.query("problems").withIndex("by_status", (q) => q.eq("status", status)).collect();
    pool.push(...rows.filter(isListed));
  }
  const solved = new Set<string>();
  for (const userId of userIds) for (const slug of await solvedSlugs(ctx, userId)) solved.add(slug);
  const decks = { easy: [] as Card[], medium: [] as Card[], hard: [] as Card[] };
  for (const level of LEVELS) {
    const ofLevel = pool.filter((p) => p.difficulty === level);
    const ordered = [
      ...shuffle(ofLevel.filter((p) => !solved.has(p.slug))),
      ...shuffle(ofLevel.filter((p) => solved.has(p.slug))),
    ];
    decks[level] = ordered.slice(0, DECK_SIZE[level]).map((p) => ({ problemId: p._id, version: p.version }));
  }
  return decks;
}

async function territoryRating(ctx: QueryCtx, userId: Id<"users">) {
  const row = await ctx.db
    .query("ratings")
    .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", "territory"))
    .unique();
  return row ? { mu: row.rating, sigma: row.rd } : DEFAULT_OPENSKILL;
}

/** The user's Territory game that hasn't ended yet, if any. */
export async function openGameOf(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("territoryPlayers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(3);
  for (const row of rows) {
    if (row.leftAt !== undefined) continue;
    const game = await ctx.db.get(row.gameId);
    if (game && (game.status === "countdown" || game.status === "active")) return game;
  }
  return null;
}

/**
 * Makes a game for 3 to 6 players: deals the decks, gives each a home base,
 * takes them out of every queue and cancels their 1v1 challenges, and
 * schedules the start and time up. Returns null when there are no problems.
 */
export async function createGame(
  ctx: MutationCtx,
  game: { players: { userId: Id<"users">; language: Language }[]; ranked: boolean; source: Doc<"territoryGames">["source"] },
) {
  const map = buildMap(game.players.length);
  const userIds = game.players.map((p) => p.userId);
  const decks = await dealDecks(ctx, userIds);
  if (LEVELS.every((level) => decks[level].length === 0)) return null;

  const now = Date.now();
  const startsAt = now + COUNTDOWN_MS;
  const endsAt = startsAt + GAME_TIME_MS;
  const gameId = await ctx.db.insert("territoryGames", {
    ranked: game.ranked,
    source: game.source,
    status: "countdown",
    players: game.players.length,
    decks,
    startsAt,
    endsAt,
  });

  // Home bases go to players in a random order.
  const slots = shuffle(game.players.map((_, i) => i));
  for (const [i, player] of game.players.entries()) {
    await leaveEverythingElse(ctx, player.userId);
    const rating = await territoryRating(ctx, player.userId);
    const home = map.find((r) => r.home === slots[i])!;
    await ctx.db.insert("territoryPlayers", {
      gameId,
      userId: player.userId,
      slot: slots[i],
      language: player.language,
      ratingBefore: rating.mu,
      sigmaBefore: rating.sigma,
      deck: { easy: 0, medium: 0, hard: 0 },
      submits: 0,
      points: home.value,
      regions: 1,
      scoreAt: now,
    });
  }
  for (const region of map) {
    const owner = region.home === undefined ? undefined : game.players[slots.indexOf(region.home)].userId;
    await ctx.db.insert("territoryRegions", { gameId, index: region.index, ownerId: owner });
  }
  await ctx.scheduler.runAt(startsAt, internal.territory.start, { gameId });
  await ctx.scheduler.runAt(endsAt, internal.territory.timeUp, { gameId });
  return gameId;
}

/** Takes a player out of the 1v1 queue and cancels the 1v1 challenges they sent: they're busy now. */
async function leaveEverythingElse(ctx: MutationCtx, userId: Id<"users">) {
  const queued = await ctx.db
    .query("matchQueue")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (queued) await ctx.db.delete(queued._id);
  const sent = await ctx.db
    .query("challenges")
    .withIndex("by_from_status", (q) => q.eq("fromId", userId).eq("status", "pending"))
    .collect();
  for (const c of sent) await ctx.db.patch(c._id, { status: "cancelled" });
}

export async function playersOf(ctx: QueryCtx, gameId: Id<"territoryGames">) {
  return await ctx.db
    .query("territoryPlayers")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
}

export async function regionsOf(ctx: QueryCtx, gameId: Id<"territoryGames">) {
  return await ctx.db
    .query("territoryRegions")
    .withIndex("by_game_index", (q) => q.eq("gameId", gameId))
    .collect();
}

function stateOf(regions: Doc<"territoryRegions">[]): RegionState[] {
  return regions.map((r) => ({ owner: r.ownerId, shieldUntil: r.shieldUntil }));
}

/** The player's current problem in a deck, or null once it has run out. */
export function currentCard(game: Doc<"territoryGames">, player: Doc<"territoryPlayers">, level: Level) {
  return game.decks[level][player.deck[level]] ?? null;
}

/**
 * Checks a Submit before it's sent: the game is on, the region is one the
 * player could take now, and the problem is their current one for the level
 * that takes. Returns the version to judge on; throws a code the page can show.
 */
export async function checkTerritorySubmit(
  ctx: QueryCtx,
  args: { gameId: Id<"territoryGames">; region: number; userId: Id<"users">; problemId: Id<"problems">; kind: "run" | "submit" },
) {
  const game = await ctx.db.get(args.gameId);
  const player = game && (await playersOf(ctx, game._id)).find((p) => p.userId === args.userId);
  if (!game || !player) throw new ConvexError("GAME_NOT_FOUND");
  if (game.status !== "active" || game.timeUp || Date.now() >= game.endsAt || player.leftAt !== undefined) {
    throw new ConvexError("GAME_OVER");
  }
  const map = buildMap(game.players);
  if (!map[args.region]) throw new ConvexError("REGION_NOT_FOUND");
  const regions = await regionsOf(ctx, game._id);
  const take = checkTake(map, stateOf(regions), args.userId, args.region, Date.now());
  // Run only judges the examples, so it's allowed on any region the player could work towards.
  if (args.kind === "run") {
    const level = take.ok ? take.level : map[args.region].level;
    const card = LEVELS.map((l) => currentCard(game, player, l)).find((c) => c?.problemId === args.problemId);
    if (!card) throw new ConvexError("NOT_YOUR_PROBLEM");
    return { version: card.version, level, player };
  }
  if (!take.ok) throw new ConvexError(take.reason);
  if (player.lastSubmitAt && Date.now() - player.lastSubmitAt < SUBMIT_COOLDOWN_MS) {
    throw new ConvexError("SUBMIT_COOLDOWN");
  }
  const card = currentCard(game, player, take.level);
  if (!card) throw new ConvexError("DECK_EMPTY");
  if (card.problemId !== args.problemId) throw new ConvexError("NOT_YOUR_PROBLEM");
  return { version: card.version, level: take.level, player };
}

/** Counts a Submit as it is sent. */
export async function noteTerritorySubmit(ctx: MutationCtx, player: Doc<"territoryPlayers">) {
  await ctx.db.patch(player._id, { submits: player.submits + 1, lastSubmitAt: Date.now() });
}

/**
 * A judged Submit of a game: adds it to the feed, then applies any accepted
 * Submits for its region that can go now. A runner error only re-checks,
 * since that Submit no longer holds anything back.
 */
export async function recordTerritorySubmit(ctx: MutationCtx, submission: Doc<"submissions">) {
  if (!submission.territoryGameId || submission.region === undefined) return;
  const game = await ctx.db.get(submission.territoryGameId);
  if (game?.status !== "active") return;
  const verdict = submission.verdict;
  if (verdict) {
    await ctx.db.insert("territoryEvents", {
      gameId: game._id,
      userId: submission.userId,
      kind: "submit",
      region: submission.region,
      passed: verdict.passed,
      total: verdict.total,
      accepted: verdict.status === "accepted",
    });
  }
  await settleRegion(ctx, game._id, submission.region);
  await settleTime(ctx, game._id);
}

function isPending(s: Doc<"submissions">, now: number) {
  return s.kind === "submit" && (s.status === "queued" || s.status === "running") && now - s._creationTime < JUDGING_GRACE_MS;
}

/**
 * Applies a region's accepted Submits in the order they were sent. One waits
 * while another player's earlier Submit for the region is still being judged.
 * `final` stops waiting.
 */
export async function settleRegion(
  ctx: MutationCtx,
  gameId: Id<"territoryGames">,
  region: number,
  opts: { final?: boolean } = {},
) {
  const now = Date.now();
  const submits = (
    await ctx.db
      .query("submissions")
      .withIndex("by_territory_game", (q) => q.eq("territoryGameId", gameId))
      .collect()
  ).filter((s) => s.region === region && s.kind === "submit");
  const waiting = submits
    .filter((s) => s.verdict?.status === "accepted" && !s.territoryOutcome)
    .sort((a, b) => a._creationTime - b._creationTime);
  for (const submission of waiting) {
    const blocked =
      !opts.final &&
      submits.some((s) => s.userId !== submission.userId && s._creationTime < submission._creationTime && isPending(s, now));
    if (blocked) return;
    const game = await ctx.db.get(gameId);
    if (game?.status !== "active") return;
    await applyCapture(ctx, game, submission);
  }
}

/** Takes the region for an accepted Submit if the rules still allow it; otherwise it's missed. */
async function applyCapture(ctx: MutationCtx, game: Doc<"territoryGames">, submission: Doc<"submissions">) {
  const index = submission.region!;
  const players = await playersOf(ctx, game._id);
  const player = players.find((p) => p.userId === submission.userId);
  const problem = await ctx.db.get(submission.problemId);
  const regions = await regionsOf(ctx, game._id);
  const map = buildMap(game.players);
  const now = Date.now();
  const take = checkTake(map, stateOf(regions), submission.userId, index, now);
  // The problem must still be the player's current one at a level that takes the region.
  const level = problem?.difficulty;
  const stillTheirs = player && level && currentCard(game, player, level)?.problemId === submission.problemId;
  if (!player || player.leftAt !== undefined || !take.ok || !level || !stillTheirs || !atLeast(level, take.level)) {
    await ctx.db.patch(submission._id, { territoryOutcome: "missed" });
    await ctx.db.insert("territoryEvents", { gameId: game._id, userId: submission.userId, kind: "missed", region: index });
    return;
  }

  const row = regions[index];
  const fromId = row.ownerId;
  await ctx.db.patch(row._id, { ownerId: player.userId, capturedAt: now, shieldUntil: now + SHIELD_MS });
  await ctx.db.patch(submission._id, { territoryOutcome: "captured" });
  await ctx.db.insert("territoryEvents", {
    gameId: game._id,
    userId: player.userId,
    kind: take.attack ? "attack" : "claim",
    region: index,
    fromId,
  });

  // Points and region counts for the two players whose holdings changed; the
  // capturer's problem at that level moves on.
  const value = map[index].value;
  await ctx.db.patch(player._id, {
    deck: { ...player.deck, [level]: player.deck[level] + 1 },
    points: player.points + value,
    regions: player.regions + 1,
    scoreAt: now,
  });
  const loser = fromId && players.find((p) => p.userId === fromId);
  if (loser) await ctx.db.patch(loser._id, { points: loser.points - value, regions: loser.regions - 1, scoreAt: now });

  if (player.points + value >= winningPoints(map)) {
    await finishGame(ctx, game._id, { reason: "majority" });
  }
}

/**
 * After time up: ends the game once no Submit sent in time is still being
 * judged. `final` applies whatever is left without waiting.
 */
export async function settleTime(ctx: MutationCtx, gameId: Id<"territoryGames">, opts: { final?: boolean } = {}) {
  const game = await ctx.db.get(gameId);
  if (game?.status !== "active" || !game.timeUp) return;
  const now = Date.now();
  const submits = await ctx.db
    .query("submissions")
    .withIndex("by_territory_game", (q) => q.eq("territoryGameId", gameId))
    .collect();
  if (!opts.final && submits.some((s) => s._creationTime <= game.endsAt && isPending(s, now))) return;
  if (opts.final) {
    const regions = new Set(
      submits.filter((s) => s.verdict?.status === "accepted" && !s.territoryOutcome).map((s) => s.region!),
    );
    for (const region of regions) await settleRegion(ctx, gameId, region, { final: true });
  }
  await finishGame(ctx, gameId, { reason: "time" });
}

/** A player leaves. In the countdown the game is cancelled; after it they place last. */
export async function leaveGame(ctx: MutationCtx, game: Doc<"territoryGames">, player: Doc<"territoryPlayers">) {
  if (game.status === "countdown") {
    await ctx.db.patch(game._id, { status: "cancelled", reason: "cancelled", finishedAt: Date.now() });
    return;
  }
  await ctx.db.patch(player._id, { leftAt: Date.now() });
  await ctx.db.insert("territoryEvents", { gameId: game._id, userId: player.userId, kind: "forfeit" });
  const staying = (await playersOf(ctx, game._id)).filter((p) => p.leftAt === undefined);
  if (staying.length <= 1) await finishGame(ctx, game._id, { reason: "last-standing" });
}

/** Ranked Territory games the user played that were counted, since the start of today (UTC). */
async function countedToday(ctx: QueryCtx, userId: Id<"users">, dayStart: number) {
  const rows = await ctx.db
    .query("territoryPlayers")
    .withIndex("by_user", (q) => q.eq("userId", userId).gte("_creationTime", dayStart - GAME_TIME_MS))
    .collect();
  const games = new Set<Id<"territoryGames">>();
  for (const row of rows) {
    if (!row.counted) continue;
    const game = await ctx.db.get(row.gameId);
    if (game?.finishedAt !== undefined && game.finishedAt >= dayStart) games.add(row.gameId);
  }
  return games;
}

/** Whether a ranked game changes ratings: no pair in it had 3 counted games together today. */
async function isCounted(ctx: QueryCtx, players: Doc<"territoryPlayers">[]) {
  const dayStart = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const played = await Promise.all(players.map((p) => countedToday(ctx, p.userId, dayStart)));
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const together = [...played[i]].filter((id) => played[j].has(id)).length;
      if (together >= PAIR_GAMES_PER_DAY) return false;
    }
  }
  return true;
}

/**
 * Writes the result: placements for everyone, and for a counted ranked game
 * new ratings and XP; badges for whoever holds the Core.
 */
export async function finishGame(
  ctx: MutationCtx,
  gameId: Id<"territoryGames">,
  outcome: { reason: "majority" | "time" | "last-standing" },
) {
  const game = await ctx.db.get(gameId);
  if (game?.status !== "active") return;
  const players = await playersOf(ctx, gameId);
  const places = placements(
    players.map((p) => ({ id: p.userId, points: p.points, regions: p.regions, scoreAt: p.scoreAt, leftAt: p.leftAt })),
  );
  const placeOf = new Map(places.map((p) => [p.id, p.place]));
  const firsts = places.filter((p) => p.place === 1);
  await ctx.db.patch(gameId, {
    status: "finished",
    finishedAt: Date.now(),
    winnerId: firsts.length === 1 ? firsts[0].id : undefined,
    reason: outcome.reason,
  });

  const counted = game.ranked && (await isCounted(ctx, players));
  const changes = counted
    ? await recordTerritory(
        ctx,
        players.map((p) => ({ userId: p.userId, place: placeOf.get(p.userId)! })),
      )
    : [];
  const core = (await regionsOf(ctx, gameId))[0];

  for (const player of players) {
    const place = placeOf.get(player.userId)!;
    const change = changes.find((c) => c.userId === player.userId);
    let xpAwarded: number | undefined;
    const badges: string[] = [];
    if (counted) {
      const amount = place === 1 ? TERRITORY_XP.first : place === 2 ? TERRITORY_XP.second : TERRITORY_XP.played;
      const xp = await awardXp(ctx, { userId: player.userId, key: `territory:${gameId}`, source: "territory", amount });
      if (xp.awarded) xpAwarded = amount;
      badges.push(...xp.badges);
    }
    badges.push(...(await checkTerritoryBadges(ctx, player.userId, { heldCore: game.ranked && core.ownerId === player.userId })));
    await ctx.db.patch(player._id, {
      place,
      counted,
      ratingChange: change?.change,
      xpAwarded,
      badgesEarned: badges.length ? badges : undefined,
    });
  }
}
