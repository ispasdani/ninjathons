// @vitest-environment node
// Ways into a Territory game (decisions §16): lobbies by link or group, and
// Find a match.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { GROUP_WAIT_MS } from "./lib/matchmaking";
import { PROVISIONAL_GAMES } from "./lib/ratings";
import { LOBBY_STALE_MS, LOBBY_TTL_MS } from "./territoryLobbies";
import { identity, setup } from "./test.setup";

const NAMES = ["ada", "bob", "cyd", "dee", "eve", "fay", "gus"];

function problem(slug: string, difficulty: "easy" | "medium" | "hard") {
  return {
    slug,
    title: slug,
    statement: "Return a + b.",
    difficulty,
    tags: [],
    judge: {
      mode: "function" as const,
      signature: {
        functionName: "add",
        params: [
          { name: "a", type: "int" as const },
          { name: "b", type: "int" as const },
        ],
        returns: "int" as const,
      },
    },
    checker: { kind: "exact" as const },
    examples: [{ input: '{"a":1,"b":2}', output: "3" }],
    limits: { timeMs: 2000, memoryMb: 256 },
    languages: "all" as const,
    pool: "practice" as const,
    version: 1,
    hints: [],
    status: "beta" as const,
  };
}

async function seeded() {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  for (const [slug, d] of [["e1", "easy"], ["m1", "medium"], ["h1", "hard"]] as const) {
    await t.mutation(internal.problems.seed, { problem: problem(slug, d), tests: { file, count: 1 } });
  }
  const users: Id<"users">[] = [];
  for (const name of NAMES) {
    users.push(await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser));
    await t.withIdentity(identity(`user_${name}`)).mutation(api.user.setUsername, { username: name });
  }
  const as = (i: number) => t.withIdentity(identity(`user_${NAMES[i]}`));

  async function lobby(players: number, ranked = false) {
    const code = await as(0).mutation(api.territoryLobbies.create, { ranked, language: "python" });
    for (let i = 1; i < players; i++) await as(i).mutation(api.territoryLobbies.join, { code, language: "javascript" });
    return code;
  }

  async function rate(i: number, rating: number, games = PROVISIONAL_GAMES) {
    await t.run((ctx) =>
      ctx.db.insert("ratings", {
        userId: users[i],
        area: "territory",
        rating,
        rd: 200,
        volatility: 0,
        games,
        wins: 0,
        losses: games,
        draws: 0,
        lastGameAt: Date.now(),
      }),
    );
  }

  async function advance(ms: number) {
    vi.advanceTimersByTime(ms);
    await t.finishInProgressScheduledFunctions();
  }

  return { t, users, as, lobby, rate, advance };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("territory lobbies", () => {
  it("seats the host, lets others join by code, and stops at 6", async () => {
    const { as, lobby } = await seeded();
    const code = await lobby(6);
    const view = (await as(0).query(api.territoryLobbies.get, { code }))!;
    expect(view.players).toHaveLength(6);
    expect(view.isHost).toBe(true);
    expect(view.players.find((p) => p.host)!.username).toBe("ada");
    expect((await as(6).query(api.territoryLobbies.get, { code }))!.problem).toBe("LOBBY_FULL");
    await expect(as(6).mutation(api.territoryLobbies.join, { code, language: "python" })).rejects.toThrow("LOBBY_FULL");
  });

  it("starts with the players present, and sends them to the game", async () => {
    const { as, lobby, advance, t, users } = await seeded();
    const code = await lobby(2);
    expect((await as(0).query(api.territoryLobbies.get, { code }))!.startProblem).toBe("NOT_ENOUGH_PLAYERS");
    await expect(as(0).mutation(api.territoryLobbies.start, { code })).rejects.toThrow("NOT_ENOUGH_PLAYERS");
    await as(2).mutation(api.territoryLobbies.join, { code, language: "python" });
    // Only the host can start.
    await expect(as(1).mutation(api.territoryLobbies.start, { code })).rejects.toThrow("LOBBY_NOT_FOUND");

    const gameId = await as(0).mutation(api.territoryLobbies.start, { code });
    const players = await t.run((ctx) =>
      ctx.db
        .query("territoryPlayers")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect(),
    );
    expect(players.map((p) => p.userId).sort()).toEqual(users.slice(0, 3).sort());
    expect(players.find((p) => p.userId === users[1])!.language).toBe("javascript");
    for (const i of [0, 1, 2]) expect((await as(i).query(api.territoryLobbies.get, { code }))!.gameId).toBe(gameId);
    // Someone else with the link doesn't get the game.
    expect((await as(3).query(api.territoryLobbies.get, { code }))!.gameId).toBeNull();
    expect(await as(1).query(api.territoryLobbies.mine, {})).toBeNull();
    await advance(10_000);
    expect((await as(1).query(api.territory.get, { id: gameId }))!.status).toBe("active");
  });

  it("leaves out players who stopped sending heartbeats", async () => {
    const { as, lobby, advance, t } = await seeded();
    const code = await lobby(4);
    await advance(LOBBY_STALE_MS + 1);
    for (const i of [0, 1, 2]) await as(i).mutation(api.territoryLobbies.heartbeat, { code });
    expect((await as(0).query(api.territoryLobbies.get, { code }))!.players.filter((p) => p.away)).toHaveLength(1);
    const gameId = await as(0).mutation(api.territoryLobbies.start, { code });
    const game = await t.run((ctx) => ctx.db.get(gameId));
    expect(game!.players).toBe(3);
  });

  it("closes when the host leaves or 15 minutes pass", async () => {
    const { as, lobby, advance } = await seeded();
    const code = await lobby(3);
    await as(0).mutation(api.territoryLobbies.leave, { code });
    expect((await as(1).query(api.territoryLobbies.get, { code }))!.status).toBe("closed");
    await expect(as(3).mutation(api.territoryLobbies.join, { code, language: "python" })).rejects.toThrow("LOBBY_CLOSED");

    const other = await as(1).mutation(api.territoryLobbies.create, { ranked: false, language: "python" });
    await advance(LOBBY_TTL_MS);
    expect((await as(1).query(api.territoryLobbies.get, { code: other }))!.problem).toBe("LOBBY_CLOSED");
  });

  it("moves a player who joins another lobby out of the first", async () => {
    const { as, lobby } = await seeded();
    const first = await lobby(3);
    const second = await as(5).mutation(api.territoryLobbies.create, { ranked: false, language: "python" });
    await as(1).mutation(api.territoryLobbies.join, { code: second, language: "python" });
    expect((await as(0).query(api.territoryLobbies.get, { code: first }))!.players).toHaveLength(2);
    expect(await as(1).query(api.territoryLobbies.mine, {})).toMatchObject({ code: second, isHost: false });
    // A host opening another lobby closes their first.
    await as(0).mutation(api.territoryLobbies.create, { ranked: false, language: "python" });
    expect((await as(2).query(api.territoryLobbies.get, { code: first }))!.status).toBe("closed");
  });

  it("starts a ranked lobby only with 10 ranked games each and a spread under 400", async () => {
    const { as, lobby, rate } = await seeded();
    const code = await lobby(3, true);
    await expect(as(0).mutation(api.territoryLobbies.start, { code })).rejects.toThrow("TERRITORY_NEEDS_GAMES");
    await rate(0, 1500);
    await rate(1, 1700);
    await rate(2, 1900);
    expect((await as(0).query(api.territoryLobbies.get, { code }))!.startProblem).toBe("RATING_SPREAD");
    await expect(as(0).mutation(api.territoryLobbies.start, { code })).rejects.toThrow("RATING_SPREAD");
  });

  it("lists a group's lobbies for its members only", async () => {
    const { as, t } = await seeded();
    const groupId = await as(0).mutation(api.groups.create, { name: "Office" });
    const group = await t.run((ctx) => ctx.db.get(groupId));
    await as(1).mutation(api.groups.join, { inviteCode: group!.inviteCode });
    await expect(
      as(2).mutation(api.territoryLobbies.create, { ranked: false, language: "python", groupId }),
    ).rejects.toThrow("GROUP_NOT_FOUND");

    const code = await as(1).mutation(api.territoryLobbies.create, { ranked: false, language: "python", groupId });
    expect(await as(0).query(api.territoryLobbies.ofGroup, { groupId })).toMatchObject([
      { code, host: "bob", players: 1, ranked: false },
    ]);
    expect(await as(2).query(api.territoryLobbies.ofGroup, { groupId })).toEqual([]);
    expect((await as(0).query(api.territoryLobbies.get, { code }))!.group).toMatchObject({ name: "Office" });
  });
});

describe("territory queue", () => {
  it("forms a ranked game of 3 once the first has waited 30 seconds", async () => {
    const { as, advance, t } = await seeded();
    for (const i of [0, 1, 2]) await as(i).mutation(api.territoryQueue.join, { language: "python" });
    expect(await as(0).query(api.territoryQueue.status, {})).toMatchObject({ waiting: 2 });
    // The page keeps pinging while it waits.
    for (let s = 0; s < GROUP_WAIT_MS; s += 10_000) {
      await advance(10_000);
      for (const i of [0, 1, 2]) await as(i).mutation(api.territoryQueue.heartbeat, {});
    }
    await advance(2_000);
    const games = await t.run((ctx) => ctx.db.query("territoryGames").collect());
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ ranked: true, source: "queue", players: 3 });
    expect(await as(0).query(api.territoryQueue.status, {})).toMatchObject({ queued: null });
  });

  it("forms a game at once with 6", async () => {
    const { as, t, advance } = await seeded();
    for (const i of [0, 1, 2, 3, 4, 5]) await as(i).mutation(api.territoryQueue.join, { language: "python" });
    await advance(1);
    const games = await t.run((ctx) => ctx.db.query("territoryGames").collect());
    expect(games).toHaveLength(1);
    expect(games[0].players).toBe(6);
  });

  it("keeps a player in one queue or lobby at a time", async () => {
    const { as, lobby } = await seeded();
    await as(4).mutation(api.territoryQueue.join, { language: "python" });
    await as(4).mutation(api.queue.join, { language: "python" });
    expect(await as(4).query(api.territoryQueue.status, {})).toMatchObject({ queued: null });
    const code = await lobby(3);
    await as(4).mutation(api.territoryLobbies.join, { code, language: "python" });
    expect(await as(4).query(api.queue.status, {})).toMatchObject({ queued: null });
    await as(4).mutation(api.territoryQueue.join, { language: "python" });
    expect((await as(0).query(api.territoryLobbies.get, { code }))!.players).toHaveLength(3);
  });
});
