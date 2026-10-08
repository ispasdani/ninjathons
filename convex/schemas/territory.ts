import { defineTable } from "convex/server";
import { v } from "convex/values";

import { language } from "./problems";

// One problem in a game's deck, at the version every player is judged on.
const card = v.object({ problemId: v.id("problems"), version: v.number() });

// A position in each of the three decks.
const deckPositions = v.object({ easy: v.number(), medium: v.number(), hard: v.number() });

// A Territory game (decisions §16). The server owns the clock, as in 1v1. The
// map's shape and values follow from the player count (lib/territoryMap.ts);
// who holds what is in territoryRegions.
export const territoryGames = defineTable({
  ranked: v.boolean(),
  source: v.union(v.literal("queue"), v.literal("lobby")),
  status: v.union(
    v.literal("countdown"),
    v.literal("active"),
    v.literal("finished"),
    // A player left during the countdown, before anyone saw a problem. No result.
    v.literal("cancelled"),
  ),
  players: v.number(),
  // One deck per difficulty, the same order for every player; hidden until the game is active.
  decks: v.object({ easy: v.array(card), medium: v.array(card), hard: v.array(card) }),
  startsAt: v.number(),
  endsAt: v.number(),
  // Set by the time-up function; the result waits for Submits sent in time.
  timeUp: v.optional(v.boolean()),
  finishedAt: v.optional(v.number()),
  // The player placed first, when one player was.
  winnerId: v.optional(v.id("users")),
  reason: v.optional(
    v.union(
      // More than half the points.
      v.literal("majority"),
      v.literal("time"),
      // Everyone else left.
      v.literal("last-standing"),
      v.literal("cancelled"),
    ),
  ),
}).index("by_status", ["status"]);

// One row per player per game: their live standing, then their result.
export const territoryPlayers = defineTable({
  gameId: v.id("territoryGames"),
  userId: v.id("users"),
  // Which home base is theirs, and their colour.
  slot: v.number(),
  language,
  // Their Territory rating (mean and uncertainty) when the game was made.
  ratingBefore: v.number(),
  sigmaBefore: v.number(),
  // Their current problem in each deck; it moves on when it takes a region, or on Skip.
  deck: deckPositions,
  submits: v.number(),
  lastSubmitAt: v.optional(v.number()),
  points: v.number(),
  regions: v.number(),
  // When their points last changed, for placements.
  scoreAt: v.number(),
  leftAt: v.optional(v.number()),
  // Filled in when the game ends.
  place: v.optional(v.number()),
  counted: v.optional(v.boolean()),
  ratingChange: v.optional(v.number()),
  xpAwarded: v.optional(v.number()),
  badgesEarned: v.optional(v.array(v.string())),
})
  .index("by_game", ["gameId"])
  .index("by_user", ["userId"]);

// Who holds each region of a game's map. Home bases are held from the start.
export const territoryRegions = defineTable({
  gameId: v.id("territoryGames"),
  index: v.number(),
  ownerId: v.optional(v.id("users")),
  capturedAt: v.optional(v.number()),
  shieldUntil: v.optional(v.number()),
}).index("by_game_index", ["gameId", "index"]);

// The live feed every player sees: counts and captures, never code.
export const territoryEvents = defineTable({
  gameId: v.id("territoryGames"),
  userId: v.id("users"),
  kind: v.union(
    v.literal("submit"),
    v.literal("claim"),
    v.literal("attack"),
    // An accepted Submit that came too late to take its region.
    v.literal("missed"),
    v.literal("forfeit"),
  ),
  region: v.optional(v.number()),
  // Whose region an attack took.
  fromId: v.optional(v.id("users")),
  passed: v.optional(v.number()),
  total: v.optional(v.number()),
  accepted: v.optional(v.boolean()),
}).index("by_game", ["gameId"]);

// A Territory lobby (decisions §16): opened by a host, joined by its link or,
// for a group's lobby, from the group page. The host starts it with 3 to 6
// players. Expiry is read from `expiresAt`; nothing rewrites old rows.
export const territoryLobbies = defineTable({
  hostId: v.id("users"),
  // For the link, /lobby/<code>.
  code: v.string(),
  groupId: v.optional(v.id("groups")),
  ranked: v.boolean(),
  status: v.union(v.literal("open"), v.literal("started"), v.literal("closed")),
  expiresAt: v.number(),
  gameId: v.optional(v.id("territoryGames")),
})
  .index("by_code", ["code"])
  .index("by_group_status", ["groupId", "status"]);

// Who is in a lobby, with the language they picked. The lobby page pings; a
// player not seen for 30 seconds is left out when the host starts.
export const territoryLobbyPlayers = defineTable({
  lobbyId: v.id("territoryLobbies"),
  userId: v.id("users"),
  language,
  lastSeenAt: v.number(),
})
  .index("by_lobby", ["lobbyId"])
  .index("by_user", ["userId"]);

// Players looking for a ranked Territory game, like matchQueue for 1v1.
export const territoryQueue = defineTable({
  userId: v.id("users"),
  language,
  // Their Territory rating when they joined.
  rating: v.number(),
  joinedAt: v.number(),
  lastSeenAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_joined", ["joinedAt"]);

// A single row: when the next Territory grouping pass is due, as for 1v1.
export const territoryMatchmaking = defineTable({
  nextPassAt: v.number(),
});
