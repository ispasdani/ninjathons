// @vitest-environment node
// The weekly challenge (decisions §15): seeding a set hides its problems,
// the Monday start releases them, solves score points and XP, and the week
// is settled with the top 10% badge. Verdicts go straight to
// submissions.finish, so no runner is needed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;
type Difficulty = "easy" | "medium" | "hard";

const accepted = { status: "accepted" as const, passed: 3, total: 3, timeMs: 5, tests: [] };

function problem(slug: string, difficulty: Difficulty) {
  return {
    slug,
    title: slug,
    statement: "…",
    difficulty,
    tags: [],
    judge: { mode: "stdio" as const },
    checker: { kind: "exact" as const },
    examples: [],
    limits: { timeMs: 1000, memoryMb: 256 },
    languages: "all" as const,
    pool: "practice" as const,
    version: 1,
    hints: [],
    status: "beta" as const,
  };
}

async function seed(t: T, slug: string, difficulty: Difficulty, weeklySet?: string) {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  const { problemId } = await t.mutation(internal.problems.seed, {
    problem: problem(slug, difficulty),
    tests: { file, count: 0 },
    weeklySet,
  });
  return problemId as Id<"problems">;
}

/** Two sets of three problems, "first" then "second". */
async function seedSets(t: T) {
  const ids: Record<string, Id<"problems">> = {};
  for (const [set, slugs] of [
    ["first", ["f-easy", "f-medium", "f-hard"]],
    ["second", ["s-1", "s-2", "s-3"]],
  ] as const) {
    for (const [i, slug] of slugs.entries()) {
      ids[slug] = await seed(t, slug, (["easy", "medium", "hard"] as const)[i], set);
    }
    await t.mutation(internal.weekly.seedSet, {
      slug: set,
      title: set,
      theme: "Theme",
      order: set === "first" ? 1 : 2,
      problems: [...slugs],
    });
  }
  return ids;
}

async function player(t: T, name: string) {
  const userId = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
  return { userId, as: t.withIdentity(identity(`user_${name}`)) };
}

async function solve(t: T, userId: Id<"users">, problemId: Id<"problems">) {
  const submissionId = await t.run((ctx) =>
    ctx.db.insert("submissions", {
      userId,
      problemId,
      problemVersion: 1,
      language: "python",
      source: "",
      kind: "submit",
      status: "running",
    }),
  );
  await t.mutation(internal.submissions.finish, { submissionId, verdict: accepted });
  return (await t.run((ctx) => ctx.db.get(submissionId)))!;
}

beforeEach(() => {
  vi.useFakeTimers();
  // convex-test never lets creation times go back, so tests only move forward from here.
  vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("weekly sets", () => {
  it("hides a set's problems until it starts on a Monday, one set a week, in order", async () => {
    const t = setup();
    await seedSets(t);
    await seed(t, "plain", "easy");
    const slugs = async () => (await t.query(api.problems.library, {})).map((p) => p.slug);
    expect(await slugs()).toEqual(["plain"]);
    expect(await t.query(api.problems.getBySlug, { slug: "f-easy" })).toBeNull();

    vi.setSystemTime(new Date("2026-10-07T10:00:00Z")); // a Wednesday: not started
    expect(await t.mutation(internal.weekly.start, {})).toBeNull();

    vi.setSystemTime(new Date("2026-10-12T00:00:00Z")); // Monday, 2026-W42
    expect(await t.mutation(internal.weekly.start, {})).toBe("first");
    expect(await t.mutation(internal.weekly.start, {})).toBeNull(); // already this week's
    expect((await slugs()).sort()).toEqual(["f-easy", "f-hard", "f-medium", "plain"]);

    // Re-seeding keeps a started set's problems out, and an unstarted one's hidden.
    await seed(t, "f-easy", "easy", "first");
    await seed(t, "s-1", "easy", "second");
    expect((await slugs()).sort()).toEqual(["f-easy", "f-hard", "f-medium", "plain"]);

    vi.setSystemTime(new Date("2026-10-19T03:00:00Z")); // next Monday, caught up at 03:00
    expect(await t.mutation(internal.weekly.start, {})).toBe("second");
    vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
    expect(await t.mutation(internal.weekly.start, {})).toBeNull(); // none left
    expect((await t.query(api.weekly.current, {})).set).toBeNull();
  });
});

describe("weekly solve", () => {
  it("scores points by difficulty, times each problem from opening, and gives XP", async () => {
    const t = setup();
    const ids = await seedSets(t);
    const ada = await player(t, "ada");
    vi.setSystemTime(new Date("2026-10-12T00:00:00Z"));
    await t.mutation(internal.weekly.start, {});

    vi.setSystemTime(new Date("2026-10-12T09:00:00Z"));
    await ada.as.mutation(api.weekly.open, { slug: "f-hard" });
    vi.setSystemTime(new Date("2026-10-12T09:10:00Z"));
    const hard = await solve(t, ada.userId, ids["f-hard"]);
    expect(hard.weekly).toEqual({ points: 400, xp: 25 });
    expect((await solve(t, ada.userId, ids["f-hard"])).weekly).toBeUndefined(); // once per problem

    vi.setSystemTime(new Date("2026-10-14T09:00:00Z"));
    await solve(t, ada.userId, ids["f-easy"]); // never opened: time 0
    const last = await solve(t, ada.userId, ids["f-medium"]);
    expect(last.weekly).toEqual({ points: 200, xp: 125, setComplete: true });

    const current = await ada.as.query(api.weekly.current, {});
    expect(current.me).toEqual({ points: 700, timeMs: 600_000, solved: 3 });
    expect(current.set?.maxPoints).toBe(700);
    expect(current.set?.problems.map((p) => [p.slug, p.points, p.timeMs])).toEqual([
      ["f-easy", 100, 0],
      ["f-medium", 200, 0],
      ["f-hard", 400, 600_000],
    ]);
    // Solve XP (10 + 40 + 20) plus weekly XP (3 × 25 + 100).
    expect((await t.run((ctx) => ctx.db.get(ada.userId)))?.xp).toBe(70 + 175);

    // After the week, the problems are ordinary library problems.
    vi.setSystemTime(new Date("2026-10-19T09:00:00Z"));
    const later = await player(t, "bob");
    expect((await solve(t, later.userId, ids["f-easy"])).weekly).toBeUndefined();
  });
});

describe("weekly settle and board", () => {
  it("ranks by points then less time, and gives the top 10% (rounded up) the badge once", async () => {
    const t = setup();
    const ids = await seedSets(t);
    vi.setSystemTime(new Date("2026-10-12T00:00:00Z"));
    await t.mutation(internal.weekly.start, {});

    // 11 players: the top 2 earn the badge.
    const players = [];
    for (let i = 0; i < 11; i++) players.push(await player(t, `p${String(i).padStart(2, "0")}`));
    vi.setSystemTime(new Date("2026-10-12T08:00:00Z"));
    for (const p of players) await p.as.mutation(api.weekly.open, { slug: "f-easy" });
    for (const [i, p] of players.entries()) {
      vi.setSystemTime(new Date(Date.parse("2026-10-12T08:01:00Z") + i * 60_000));
      await solve(t, p.userId, ids["f-easy"]);
    }
    await solve(t, players[10].userId, ids["f-medium"]); // most points despite being slowest

    await t.mutation(internal.leaderboards.rebuildAll, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const board = await t.query(api.leaderboards.board, { board: "weekly", scope: "global", limit: 3 });
    expect(board.rows.map((r) => [r.username ?? r.name, r.value])).toEqual([
      ["p10", 300],
      ["p00", 100],
      ["p01", 100],
    ]);
    expect(board.rows[1]).toMatchObject({ timeMs: 60_000, solved: 1 });
    await expect(t.query(api.leaderboards.board, { board: "weekly", scope: "global", week: "W42" })).rejects.toThrow(
      "BAD_WEEK",
    );

    vi.setSystemTime(new Date("2026-10-19T00:00:00Z"));
    await t.mutation(internal.weekly.start, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.mutation(internal.weekly.start, {}); // settling twice changes nothing
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const holders = await t.run((ctx) =>
      ctx.db
        .query("userBadges")
        .filter((q) => q.eq(q.field("badgeId"), "weekly-top-10"))
        .collect(),
    );
    expect(holders.map((h) => h.userId).sort()).toEqual([players[10].userId, players[0].userId].sort());

    // Last week's board stays readable.
    const lastWeek = await t.query(api.leaderboards.board, { board: "weekly", scope: "global", week: "2026-W42" });
    expect(lastWeek.rows).toHaveLength(11);
  });
});
