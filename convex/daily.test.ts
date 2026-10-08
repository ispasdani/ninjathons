// @vitest-environment node
// The daily challenge (decisions §15): the pick, a solve through a judged
// Submit, the streak and its XP, the nightly settle. Verdicts are written
// straight to submissions.finish, so no runner is needed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { recordDailySolve } from "./lib/daily";
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

async function seed(t: T, slug: string, difficulty: Difficulty) {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  const { problemId } = await t.mutation(internal.problems.seed, {
    problem: problem(slug, difficulty),
    tests: { file, count: 0 },
  });
  return problemId as Id<"problems">;
}

async function player(t: T, name: string) {
  const userId = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
  return { userId, as: t.withIdentity(identity(`user_${name}`)) };
}

/** An accepted Submit sent now, judged at once. */
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

async function dailySlug(t: T, day: string) {
  return await t.run(async (ctx) => {
    const daily = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_day", (q) => q.eq("day", day))
      .unique();
    return daily && (await ctx.db.get(daily.problemId))!.slug;
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  // convex-test never lets creation times go back, so tests only move forward from here.
  vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("daily pick", () => {
  it("picks the weekday's difficulty once a day, and never the same problem twice", async () => {
    const t = setup();
    await seed(t, "e1", "easy");
    await seed(t, "e2", "easy");
    await seed(t, "m1", "medium");
    await seed(t, "h1", "hard");

    vi.setSystemTime(new Date("2026-10-05T00:00:00Z")); // Monday
    const first = await t.mutation(internal.daily.pick, {});
    expect(["e1", "e2"]).toContain(first);
    expect(await t.mutation(internal.daily.pick, {})).toBeNull(); // already picked
    const second = await t.mutation(internal.daily.pick, { day: "2026-10-06" });
    expect(["e1", "e2"]).toContain(second);
    expect(second).not.toBe(first);

    // No easy left: Medium instead.
    expect(await t.mutation(internal.daily.pick, { day: "2026-10-12" })).toBe("m1");
    // Saturday: hard.
    expect(await t.mutation(internal.daily.pick, { day: "2026-10-10" })).toBe("h1");
    // None left at all: the one used longest ago.
    expect(await t.mutation(internal.daily.pick, { day: "2026-10-13" })).toBe(first);
  });

  it("never picks a draft or a weekly set's problem before its week is over", async () => {
    const t = setup();
    const weekly = await seed(t, "weekly-one", "easy");
    const later = await seed(t, "weekly-later", "easy");
    await seed(t, "plain", "medium");
    await t.run(async (ctx) => {
      const draft = await ctx.db.insert("problems", { ...problem("draft", "easy"), status: "draft" });
      void draft;
      await ctx.db.patch(later, { unreleased: true });
      await ctx.db.insert("weeklySets", { slug: "s1", title: "S1", theme: "", order: 1, problemIds: [weekly], week: "2026-W41" });
      await ctx.db.insert("weeklySets", { slug: "s2", title: "S2", theme: "", order: 2, problemIds: [later] });
    });
    vi.setSystemTime(new Date("2026-10-05T00:00:00Z")); // Monday of 2026-W41
    expect(await t.mutation(internal.daily.pick, {})).toBe("plain");
    // The week after, set 1's problem is fair game.
    expect(await t.mutation(internal.daily.pick, { day: "2026-10-12" })).toBe("weekly-one");
  });
});

describe("daily solve", () => {
  it("times the solve from opening, builds the streak and awards XP", async () => {
    const t = setup();
    const a = await seed(t, "a", "easy");
    const b = await seed(t, "b", "easy");
    const ada = await player(t, "ada");

    vi.setSystemTime(new Date("2026-10-05T08:00:00Z"));
    await t.mutation(internal.daily.pick, {});
    const today = (await dailySlug(t, "2026-10-05"))!;
    const todayId = today === "a" ? a : b;
    await ada.as.mutation(api.daily.open, { slug: today });
    vi.setSystemTime(new Date("2026-10-05T08:01:30Z"));
    const submission = await solve(t, ada.userId, todayId);
    expect(submission.daily).toEqual({ xp: 30, streak: 1 });
    expect(submission.xpAwarded).toBe(10);

    const view = await ada.as.query(api.daily.today, {});
    expect(view.problem?.slug).toBe(today);
    expect(view.me).toMatchObject({ timeMs: 90_000, streak: 1, totalSolved: 1, atRisk: false });

    // Solving it again the same day earns nothing more.
    expect((await solve(t, ada.userId, todayId)).daily).toBeUndefined();

    // The next day, the other problem: streak 2, 35 XP, even though solved before.
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
    await t.mutation(internal.daily.pick, {});
    expect((await ada.as.query(api.daily.today, {})).me).toMatchObject({ streak: 1, atRisk: true });
    const second = await solve(t, ada.userId, todayId === a ? b : a);
    expect(second.daily).toEqual({ xp: 35, streak: 2 });
    expect((await ada.as.query(api.daily.today, {})).me).toMatchObject({ streak: 2, atRisk: false });

    const user = await t.run((ctx) => ctx.db.get(ada.userId));
    expect(user?.xp).toBe(10 + 30 + 10 + 35);
  });

  it("doesn't count a match Submit or another problem", async () => {
    const t = setup();
    const a = await seed(t, "a", "easy");
    const other = await seed(t, "other", "medium");
    const ada = await player(t, "ada");
    vi.setSystemTime(new Date("2026-10-05T08:00:00Z"));
    await t.mutation(internal.daily.pick, {});

    expect((await solve(t, ada.userId, other)).daily).toBeUndefined();
    // A match Submit to the daily's problem (the match side is tested in matches.test.ts).
    const recorded = await t.run(async (ctx) => {
      const matchId = await ctx.db.insert("matches", {
        mode: "1v1",
        ranked: false,
        source: "challenge",
        status: "active",
        problemId: a,
        problemVersion: 1,
        difficulty: "easy",
        startsAt: Date.now(),
        endsAt: Date.now() + 60_000,
      });
      const id = await ctx.db.insert("submissions", {
        userId: ada.userId,
        problemId: a,
        problemVersion: 1,
        language: "python",
        source: "",
        kind: "submit",
        status: "done",
        matchId,
      });
      return await recordDailySolve(ctx, (await ctx.db.get(id))!);
    });
    expect(recorded).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("streaks").collect())).toEqual([]);
  });

  it("lists today's fastest solves", async () => {
    const t = setup();
    const a = await seed(t, "a", "easy");
    const ada = await player(t, "ada");
    const bob = await player(t, "bob");
    vi.setSystemTime(new Date("2026-10-05T08:00:00Z"));
    await t.mutation(internal.daily.pick, {});
    await ada.as.mutation(api.daily.open, { slug: "a" });
    vi.setSystemTime(new Date("2026-10-05T08:03:00Z"));
    await bob.as.mutation(api.daily.open, { slug: "a" });
    vi.setSystemTime(new Date("2026-10-05T08:05:00Z"));
    await solve(t, ada.userId, a);
    vi.setSystemTime(new Date("2026-10-05T08:06:00Z"));
    await solve(t, bob.userId, a);
    const fastest = await t.query(api.daily.fastest, {});
    expect(fastest.map((r) => [r.name, r.timeMs])).toEqual([
      ["bob", 180_000],
      ["ada", 300_000],
    ]);
  });
});

describe("streak settle", () => {
  it("uses a freeze for a missed day, then resets", async () => {
    const t = setup();
    const ada = await player(t, "ada");
    await t.run((ctx) =>
      ctx.db.insert("streaks", {
        userId: ada.userId,
        current: 7,
        best: 7,
        totalSolved: 7,
        freezes: 1,
        coveredThrough: "2026-10-04",
        tieBreak: 0,
      }),
    );
    vi.setSystemTime(new Date("2026-10-06T00:05:00Z")); // the 5th was missed
    await t.mutation(internal.daily.settleStreaks, {});
    let row = await t.run((ctx) => ctx.db.query("streaks").first());
    expect(row).toMatchObject({ current: 7, freezes: 0, coveredThrough: "2026-10-05" });

    vi.setSystemTime(new Date("2026-10-07T00:05:00Z")); // and the 6th
    await t.mutation(internal.daily.settleStreaks, {});
    row = await t.run((ctx) => ctx.db.query("streaks").first());
    expect(row).toMatchObject({ current: 0, best: 7, totalSolved: 7 });
    expect(row?.coveredThrough).toBeUndefined();
  });

  it("goes with the account", async () => {
    const t = setup();
    const a = await seed(t, "a", "easy");
    const ada = await player(t, "ada");
    vi.setSystemTime(new Date("2026-10-05T08:00:00Z"));
    await t.mutation(internal.daily.pick, {});
    await solve(t, ada.userId, a);
    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_ada" });
    expect(await t.run((ctx) => ctx.db.query("streaks").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("dailyResults").collect())).toEqual([]);
  });
});
