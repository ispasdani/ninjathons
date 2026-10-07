import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { recordDuel } from "./lib/ratings";
import { awardXp } from "./lib/xp";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

async function player(t: T, name: string, extra: { country?: string } = {}) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId: `user_${name}`,
      email: `${name}@example.com`,
      name,
      username: name,
      imageUrl: "",
      ...extra,
    }),
  );
}

let keyCounter = 0;
async function earn(t: T, userId: Id<"users">, amount: number) {
  await t.run((ctx) => awardXp(ctx, { userId, key: `test:${keyCounter++}`, source: "solve", amount }));
  // Let time pass so ties have an order.
  vi.advanceTimersByTime(1000);
}

async function rebuild(t: T) {
  await t.mutation(internal.leaderboards.rebuildAll, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

const global = { board: "level" as const, scope: "global" as const };

describe("Level board", () => {
  it("ranks by total XP, first to reach a score ahead on ties", async () => {
    const t = setup();
    const ada = await player(t, "ada");
    const bob = await player(t, "bob");
    const cy = await player(t, "cy");
    await player(t, "idle"); // no XP: not on the board
    await earn(t, bob, 20);
    await earn(t, ada, 40);
    await earn(t, cy, 20);
    await rebuild(t);

    const { rows } = await t.query(api.leaderboards.board, global);
    expect(rows.map((r) => [r.rank, r.username, r.value])).toEqual([
      [1, "ada", 40],
      [2, "bob", 20],
      [3, "cy", 20],
    ]);
    expect(rows[0]).toMatchObject({ level: 1, title: "Initiate" });
  });

  it("is empty before the first rebuild", async () => {
    const t = setup();
    await earn(t, await player(t, "ada"), 10);
    expect(await t.query(api.leaderboards.board, global)).toEqual({ rows: [], builtAt: null, me: null });
  });

  it("shows your live XP at once and your rank after the next rebuild", async () => {
    const t = setup();
    const ada = await player(t, "ada");
    const asAda = t.withIdentity(identity("user_ada"));
    await earn(t, ada, 10);
    await rebuild(t);
    await earn(t, ada, 20);

    expect((await asAda.query(api.leaderboards.board, global)).me).toEqual({ rank: 1, value: 30 });
    expect((await asAda.query(api.leaderboards.board, global)).rows[0].value).toBe(10);
    await rebuild(t);
    expect((await asAda.query(api.leaderboards.board, global)).rows[0].value).toBe(30);
  });

  it("ranks hundreds of players across pages and keeps one version", async () => {
    const t = setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 450; i++) {
        await ctx.db.insert("users", {
          clerkId: `user_${i}`,
          email: `${i}@example.com`,
          name: `p${i}`,
          imageUrl: "",
          xp: i + 1,
          xpTieBreak: -i,
          country: i % 2 ? "RO" : "DE",
        });
      }
    });
    await rebuild(t);
    await rebuild(t);

    const snapshots = await t.run((ctx) => ctx.db.query("leaderboardSnapshots").collect());
    expect(snapshots).toHaveLength(450);
    expect(new Set(snapshots.map((s) => s.version))).toEqual(new Set([2]));
    expect(snapshots.map((s) => s.rank).sort((a, b) => a - b)).toEqual(Array.from({ length: 450 }, (_, i) => i + 1));

    const page = await t.query(api.leaderboards.board, { ...global, fromRank: 201, limit: 3 });
    expect(page.rows.map((r) => [r.rank, r.value])).toEqual([
      [201, 250],
      [202, 249],
      [203, 248],
    ]);
    const ro = await t.query(api.leaderboards.board, { board: "level", scope: "country", country: "RO", limit: 2 });
    expect(ro.rows.map((r) => [r.rank, r.value])).toEqual([
      [1, 450],
      [2, 448],
    ]);
  });
});

describe("monthly Level board", () => {
  it("counts only this month's XP and resets on the 1st", async () => {
    const t = setup();
    const ada = await player(t, "ada");
    const bob = await player(t, "bob");
    await earn(t, ada, 100);
    vi.setSystemTime(new Date("2026-11-01T00:00:01Z"));
    await earn(t, bob, 20);
    await rebuild(t);

    const november = await t.query(api.leaderboards.board, { board: "level-month", scope: "global" });
    expect(november.rows.map((r) => [r.username, r.value])).toEqual([["bob", 20]]);
    const allTime = await t.query(api.leaderboards.board, global);
    expect(allTime.rows.map((r) => r.username)).toEqual(["ada", "bob"]);
  });

  it("keeps last month's board and deletes older ones", async () => {
    const t = setup();
    await earn(t, await player(t, "ada"), 10);
    await rebuild(t); // October
    vi.setSystemTime(new Date("2026-11-15T00:00:00Z"));
    await rebuild(t);
    const october = { board: "level-month" as const, scope: "global" as const, month: "2026-10" };
    expect((await t.query(api.leaderboards.board, october)).rows).toHaveLength(1);

    vi.setSystemTime(new Date("2026-12-15T00:00:00Z"));
    await rebuild(t);
    expect((await t.query(api.leaderboards.board, october)).rows).toHaveLength(0);
    const boards = await t.run((ctx) => ctx.db.query("leaderboardVersions").collect());
    expect(boards.map((b) => b.board).sort()).toEqual(["1v1", "level", "level-month:2026-11", "level-month:2026-12"]);
  });

  it("refuses a malformed month", async () => {
    const t = setup();
    await expect(
      t.query(api.leaderboards.board, { board: "level-month", scope: "global", month: "October" }),
    ).rejects.toThrow("BAD_MONTH");
  });
});

describe("1v1 board", () => {
  it("shows only players with 10 ranked games who played in the last 30 days", async () => {
    const t = setup();
    const ada = await player(t, "ada");
    const bob = await player(t, "bob");
    const cy = await player(t, "cy");
    await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await recordDuel(ctx, { a: ada, b: bob, score: 1 });
      await recordDuel(ctx, { a: cy, b: ada, score: 1 }); // cy: 1 game, provisional
    });
    await rebuild(t);
    const board = await t.query(api.leaderboards.board, { board: "1v1", scope: "global" });
    expect(board.rows.map((r) => r.username)).toEqual(["ada", "bob"]);
    expect(board.rows[0]).toHaveProperty("tier");

    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
    await rebuild(t);
    expect((await t.query(api.leaderboards.board, { board: "1v1", scope: "global" })).rows).toEqual([]);
  });
});

describe("group scope", () => {
  it("is live, members only, and lists members with no XP yet", async () => {
    const t = setup();
    const ada = await player(t, "ada");
    await player(t, "bob");
    await player(t, "eve");
    const asAda = t.withIdentity(identity("user_ada"));
    const groupId = await asAda.mutation(api.groups.create, { name: "Office" });
    const { inviteCode } = await asAda.query(api.groups.get, { groupId });
    await t.withIdentity(identity("user_bob")).mutation(api.groups.join, { inviteCode });
    await earn(t, ada, 10);

    const board = await asAda.query(api.leaderboards.board, { board: "level", scope: "group", groupId });
    expect(board.rows.map((r) => [r.rank, r.username, r.value])).toEqual([
      [1, "ada", 10],
      [2, "bob", 0],
    ]);
    expect(board.me).toEqual({ rank: 1, value: 10 });

    await expect(
      t.withIdentity(identity("user_eve")).query(api.leaderboards.board, { board: "level", scope: "group", groupId }),
    ).rejects.toThrow("GROUP_NOT_FOUND");
    await expect(t.query(api.leaderboards.board, { board: "level", scope: "group", groupId })).rejects.toThrow(
      "GROUP_NOT_FOUND",
    );
  });
});
