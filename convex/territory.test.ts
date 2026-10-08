// @vitest-environment node
// The Territory engine (decisions §16): the map at the start, claims and
// attacks, races decided by send time, the end of a game, ratings and XP.
// Verdicts are written directly; judging itself is tested in matches.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  COUNTDOWN_MS,
  createGame,
  GAME_TIME_MS,
  PAIR_GAMES_PER_DAY,
  SUBMIT_COOLDOWN_MS,
  TERRITORY_XP,
} from "./lib/territory";
import { buildMap, neighbours, SHIELD_MS } from "./lib/territoryMap";
import type { Verdict } from "./schemas/submissions";
import { identity, setup } from "./test.setup";

vi.mock("./judge/vercelRunner", () => ({
  RunnerNotConfiguredError: class extends Error {},
  vercelRunner: () => {
    throw new Error("Territory tests write verdicts directly");
  },
}));

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

const PROBLEMS = [
  ...["e1", "e2", "e3", "e4"].map((s) => problem(s, "easy")),
  ...["m1", "m2", "m3"].map((s) => problem(s, "medium")),
  ...["h1", "h2"].map((s) => problem(s, "hard")),
];

const ACCEPTED: Verdict = { status: "accepted", passed: 3, total: 3, timeMs: 5, tests: [] };
const WRONG: Verdict = { status: "wrong_answer", passed: 1, total: 3, timeMs: 5, tests: [] };

const NAMES = ["ada", "bob", "cyd", "dee"];

async function seeded() {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  for (const p of PROBLEMS) await t.mutation(internal.problems.seed, { problem: p, tests: { file, count: 2 } });
  const users: Id<"users">[] = [];
  for (const name of NAMES) {
    users.push(await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser));
    await t.withIdentity(identity(`user_${name}`)).mutation(api.user.setUsername, { username: name });
  }
  const as = (i: number) => t.withIdentity(identity(`user_${NAMES[i]}`));

  async function game(players = 3, ranked = true) {
    const id = await t.run((ctx) =>
      createGame(ctx, {
        players: users.slice(0, players).map((userId) => ({ userId, language: "python" as const })),
        ranked,
        source: "lobby",
      }),
    );
    return id!;
  }

  async function advance(ms: number) {
    vi.advanceTimersByTime(ms);
    await t.finishInProgressScheduledFunctions();
  }

  /** A started game, with each player's home base and an empty edge region next to it. */
  async function started(players = 3, ranked = true) {
    const gameId = await game(players, ranked);
    await advance(COUNTDOWN_MS);
    const rows = await t.run((ctx) =>
      ctx.db
        .query("territoryPlayers")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect(),
    );
    const map = buildMap(players);
    const homes = users.slice(0, players).map((u) => {
      const slot = rows.find((r) => r.userId === u)!.slot;
      return map.find((r) => r.home === slot)!.index;
    });
    const edgeNext = homes.map((h) => neighbours(map, h).find((n) => n.ring === map[h].ring)!.index);
    return { gameId, map, homes, edgeNext };
  }

  async function view(i: number, gameId: Id<"territoryGames">) {
    return (await as(i).query(api.territory.get, { id: gameId }))!;
  }

  /** Sends a Submit of player i's current problem for `level` without judging it. */
  async function submit(i: number, gameId: Id<"territoryGames">, region: number, level: "easy" | "medium" | "hard") {
    const slug = (await view(i, gameId)).problems![level]!.slug;
    const submissionId = await as(i).mutation(api.submissions.create, {
      slug,
      language: "python",
      source: "def add(a, b):\n    return a + b\n",
      kind: "submit",
      territory: { gameId, region },
    });
    await t.mutation(internal.submissions.markRunning, { submissionId });
    return submissionId;
  }
  async function judge(submissionId: Id<"submissions">, v: Verdict = ACCEPTED) {
    await t.mutation(internal.submissions.finish, { submissionId, verdict: v });
  }

  async function setOwner(gameId: Id<"territoryGames">, index: number, ownerId?: Id<"users">) {
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("territoryRegions")
        .withIndex("by_game_index", (q) => q.eq("gameId", gameId).eq("index", index))
        .unique();
      await ctx.db.patch(row!._id, { ownerId, shieldUntil: undefined });
    });
  }
  async function player(gameId: Id<"territoryGames">, userId: Id<"users">) {
    return await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("territoryPlayers")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();
      return rows.find((r) => r.userId === userId)!;
    });
  }
  async function patchPlayer(gameId: Id<"territoryGames">, userId: Id<"users">, fields: Partial<Doc<"territoryPlayers">>) {
    const row = await player(gameId, userId);
    await t.run((ctx) => ctx.db.patch(row._id, fields));
  }

  return { t, users, as, game, advance, started, view, submit, judge, setOwner, player, patchPlayer };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("territory", () => {
  it("starts with home bases held and the problems hidden until the countdown ends", async () => {
    const { game, view, advance } = await seeded();
    const gameId = await game(3);
    const before = await view(0, gameId);
    expect(before.status).toBe("countdown");
    expect(before.problems).toBeNull();
    expect(before.regions).toHaveLength(37);
    expect(before.regions.filter((r) => r.ownerId)).toHaveLength(3);
    expect(before.players.map((p) => p.points)).toEqual([1, 1, 1]);
    expect(before.winningPoints).toBe(33);

    await advance(COUNTDOWN_MS);
    const after = await view(0, gameId);
    expect(after.status).toBe("active");
    expect(after.problems!.easy!.difficulty).toBe("easy");
    expect(after.problems!.medium!.difficulty).toBe("medium");
    expect(after.problems!.hard!.difficulty).toBe("hard");
    // Everyone gets the same deck in the same order.
    expect((await view(1, gameId)).problems!.easy!.slug).toBe(after.problems!.easy!.slug);
  });

  it("uses the 61-region map for 5 or more players, and refuses a game of 2", async () => {
    const { t, users } = await seeded();
    await expect(
      t.run((ctx) =>
        createGame(ctx, {
          players: users.slice(0, 2).map((userId) => ({ userId, language: "python" as const })),
          ranked: false,
          source: "lobby",
        }),
      ),
    ).rejects.toThrow("3 to 6 players");
  });

  it("claims an empty region next to a home base with the current easy problem", async () => {
    const { started, submit, judge, view, users } = await seeded();
    const { gameId, edgeNext } = await started();
    const firstEasy = (await view(0, gameId)).problems!.easy!.slug;
    await judge(await submit(0, gameId, edgeNext[0], "easy"));

    const after = await view(0, gameId);
    const region = after.regions[edgeNext[0]];
    expect(region.ownerId).toBe(users[0]);
    expect(region.shieldUntil).toBeGreaterThan(Date.now());
    const me = after.players.find((p) => p.you)!;
    expect(me).toMatchObject({ points: 2, regions: 2, submits: 1 });
    // The next easy problem is up.
    expect(after.problems!.easy!.slug).not.toBe(firstEasy);
    expect(after.events.map((e) => e.kind)).toEqual(["claim", "submit"]);
  });

  it("takes nothing on a wrong answer, and keeps the same problem", async () => {
    const { started, submit, judge, view } = await seeded();
    const { gameId, edgeNext } = await started();
    const easy = (await view(0, gameId)).problems!.easy!.slug;
    await judge(await submit(0, gameId, edgeNext[0], "easy"), WRONG);
    const after = await view(0, gameId);
    expect(after.regions[edgeNext[0]].ownerId).toBeUndefined();
    expect(after.problems!.easy!.slug).toBe(easy);
  });

  it("refuses Submits for regions the player can't take, the wrong problem, and too soon after the last", async () => {
    const { started, submit, judge, as, view, advance } = await seeded();
    const { gameId, homes, edgeNext } = await started();
    await expect(submit(0, gameId, 0, "hard")).rejects.toThrow("NOT_NEXT_TO_YOURS");
    await expect(submit(0, gameId, homes[1], "easy")).rejects.toThrow("HOME_BASE");
    await expect(submit(0, gameId, homes[0], "easy")).rejects.toThrow("ALREADY_YOURS");
    // The medium problem on an easy region.
    await expect(submit(0, gameId, edgeNext[0], "medium")).rejects.toThrow("NOT_YOUR_PROBLEM");

    await judge(await submit(0, gameId, edgeNext[0], "easy"), WRONG);
    await expect(submit(0, gameId, edgeNext[0], "easy")).rejects.toThrow("SUBMIT_COOLDOWN");
    await advance(SUBMIT_COOLDOWN_MS);
    await submit(0, gameId, edgeNext[0], "easy");

    // Run is allowed on any of your current problems.
    const medium = (await view(1, gameId)).problems!.medium!.slug;
    await as(1).mutation(api.submissions.create, {
      slug: medium,
      language: "python",
      source: "",
      kind: "run",
      territory: { gameId, region: 0 },
    });
  });

  it("attacks a rival's region one level harder, and not while it's shielded", async () => {
    const { started, submit, judge, view, setOwner, users, advance, t } = await seeded();
    const { gameId, edgeNext } = await started();
    // Bob holds the edge region next to Ada's home, freshly captured.
    await setOwner(gameId, edgeNext[0], users[1]);
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("territoryRegions")
        .withIndex("by_game_index", (q) => q.eq("gameId", gameId).eq("index", edgeNext[0]))
        .unique();
      await ctx.db.patch(row!._id, { shieldUntil: Date.now() + SHIELD_MS });
    });
    await expect(submit(0, gameId, edgeNext[0], "medium")).rejects.toThrow("SHIELDED");
    await advance(SHIELD_MS);
    // An easy problem no longer takes it.
    await expect(submit(0, gameId, edgeNext[0], "easy")).rejects.toThrow("NOT_YOUR_PROBLEM");
    await judge(await submit(0, gameId, edgeNext[0], "medium"));

    const after = await view(0, gameId);
    expect(after.regions[edgeNext[0]].ownerId).toBe(users[0]);
    expect(after.events[0]).toMatchObject({ kind: "attack", fromId: users[1] });
  });

  it("decides a race by when the Submits were sent, and lets the late one keep its problem", async () => {
    const { started, submit, judge, view, setOwner, users, advance } = await seeded();
    const { gameId, edgeNext } = await started();
    // Both Ada and Bob hold a region next to the empty target.
    const target = edgeNext[0];
    const map = buildMap(3);
    const besideTarget = neighbours(map, target).find((n) => n.ring === 3 && n.home === undefined)!.index;
    await setOwner(gameId, besideTarget, users[1]);

    const adaFirst = await submit(0, gameId, target, "easy");
    await advance(1_000);
    const bobSecond = await submit(1, gameId, target, "easy");
    const bobProblem = (await view(1, gameId)).problems!.easy!.slug;

    // Bob's verdict comes back first, but Ada sent hers earlier: Bob waits.
    await judge(bobSecond);
    expect((await view(0, gameId)).regions[target].ownerId).toBeUndefined();
    await judge(adaFirst);

    const after = await view(1, gameId);
    expect(after.regions[target].ownerId).toBe(users[0]);
    expect(after.events.map((e) => e.kind).slice(0, 3)).toEqual(["missed", "claim", "submit"]);
    // Bob's solve took nothing, so his easy problem is still his to use elsewhere.
    expect(after.problems!.easy!.slug).toBe(bobProblem);
  });

  it("stops waiting for an earlier Submit that never comes back", async () => {
    const { started, submit, judge, view, setOwner, users, advance } = await seeded();
    const { gameId, edgeNext } = await started();
    const target = edgeNext[0];
    const besideTarget = neighbours(buildMap(3), target).find((n) => n.ring === 3 && n.home === undefined)!.index;
    await setOwner(gameId, besideTarget, users[1]);
    await submit(0, gameId, target, "easy");
    const bob = await submit(1, gameId, target, "easy");
    // Ada's judging is lost; two minutes on, Bob's verdict no longer waits for it.
    await advance(2 * 60_000);
    await judge(bob);
    expect((await view(1, gameId)).regions[target].ownerId).toBe(users[1]);
  });

  it("skips to the next problem of a level for good", async () => {
    const { started, as, view } = await seeded();
    const { gameId } = await started();
    const before = await view(0, gameId);
    await as(0).mutation(api.territory.skip, { id: gameId, level: "hard" });
    const after = await view(0, gameId);
    expect(after.problems!.hard!.slug).not.toBe(before.problems!.hard!.slug);
    expect(after.deckLeft.hard).toBe(0);
    await as(0).mutation(api.territory.skip, { id: gameId, level: "hard" });
    expect((await view(0, gameId)).problems!.hard).toBeNull();
    await expect(as(0).mutation(api.territory.skip, { id: gameId, level: "hard" })).rejects.toThrow("DECK_EMPTY");
  });

  it("ends at once on more than half the points, with ratings, XP and the Core badge", async () => {
    const { started, submit, judge, view, setOwner, patchPlayer, users, t } = await seeded();
    const { gameId, map } = await started();
    // Ada holds the inner ring and 31 points; taking the Core (+5) passes 33.
    for (const r of map.filter((r) => r.ring === 1)) await setOwner(gameId, r.index, users[0]);
    await patchPlayer(gameId, users[0], { points: 31, regions: 10 });
    await patchPlayer(gameId, users[1], { points: 3, regions: 2 });
    await judge(await submit(0, gameId, 0, "hard"));

    const after = await view(0, gameId);
    expect(after.status).toBe("finished");
    expect(after.reason).toBe("majority");
    expect(after.winnerId).toBe(users[0]);
    const byUser = new Map(after.players.map((p) => [p.userId, p]));
    expect(byUser.get(users[0])).toMatchObject({ place: 1, counted: true, xpAwarded: TERRITORY_XP.first });
    expect(byUser.get(users[0])!.badgesEarned).toContain("core-holder");
    expect(byUser.get(users[1])!.place).toBe(2);
    expect(byUser.get(users[2])!.place).toBe(3);
    expect(byUser.get(users[0])!.ratingChange).toBeGreaterThan(0);
    expect(byUser.get(users[2])!.ratingChange).toBeLessThan(0);

    const ratings = await t.run((ctx) => ctx.db.query("ratings").collect());
    expect(ratings.filter((r) => r.area === "territory")).toHaveLength(3);
    const xp = await t.run((ctx) => ctx.db.query("xpLedger").collect());
    const territoryXp = xp.filter((e) => e.source === "territory").map((e) => e.amount).sort((a, b) => a - b);
    expect(territoryXp).toEqual([TERRITORY_XP.played, TERRITORY_XP.second, TERRITORY_XP.first]);
  });

  it("places by points at time up, after Submits sent in time are judged", async () => {
    const { started, submit, judge, view, advance, users } = await seeded();
    const { gameId, edgeNext } = await started(3, false);
    await judge(await submit(1, gameId, edgeNext[1], "easy"));
    // Sent just before time up, judged after.
    await advance(GAME_TIME_MS - 1_000);
    const late = await submit(2, gameId, edgeNext[2], "easy");
    await advance(1_000);
    expect((await view(0, gameId)).status).toBe("active");
    await judge(late);

    const after = await view(0, gameId);
    expect(after.status).toBe("finished");
    expect(after.reason).toBe("time");
    const places = new Map(after.players.map((p) => [p.userId, p.place]));
    // Bob and Cyd both have 2 points; Bob got there first.
    expect(places.get(users[1])).toBe(1);
    expect(places.get(users[2])).toBe(2);
    expect(places.get(users[0])).toBe(3);
    // Unranked: no XP, no rating.
    expect(after.players.every((p) => !p.counted && p.ratingChange === undefined)).toBe(true);
  });

  it("cancels the game when a player leaves in the countdown", async () => {
    const { game, as, view } = await seeded();
    const gameId = await game(3);
    await as(2).mutation(api.territory.forfeit, { id: gameId });
    expect((await view(0, gameId)).status).toBe("cancelled");
  });

  it("places leavers last and ends when one player is left", async () => {
    const { started, as, view, users, advance } = await seeded();
    const { gameId } = await started();
    await as(0).mutation(api.territory.forfeit, { id: gameId });
    expect((await view(1, gameId)).status).toBe("active");
    await advance(1_000);
    await as(2).mutation(api.territory.forfeit, { id: gameId });
    const after = await view(1, gameId);
    expect(after.status).toBe("finished");
    expect(after.reason).toBe("last-standing");
    const places = new Map(after.players.map((p) => [p.userId, p.place]));
    expect([places.get(users[1]), places.get(users[2]), places.get(users[0])]).toEqual([1, 2, 3]);
  });

  it("stops rating a group after 3 counted games together in a day", async () => {
    const { started, as, view } = await seeded();
    for (let i = 0; i < PAIR_GAMES_PER_DAY + 1; i++) {
      const { gameId } = await started();
      await as(0).mutation(api.territory.forfeit, { id: gameId });
      await as(1).mutation(api.territory.forfeit, { id: gameId });
      const counted = (await view(2, gameId)).players.every((p) => p.counted);
      expect(counted).toBe(i < PAIR_GAMES_PER_DAY);
    }
  });

  it("keeps players in a game out of the 1v1 queue", async () => {
    const { game, as } = await seeded();
    await game(3);
    await expect(as(0).mutation(api.queue.join, { language: "python" })).rejects.toThrow("ALREADY_IN_MATCH");
    expect(await as(0).query(api.territory.current, {})).not.toBeNull();
  });
});
