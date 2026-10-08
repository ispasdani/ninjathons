// @vitest-environment node
// Learn (decisions §17): a lesson finishes once it's opened and every exercise
// is solved, earlier solves included; modules and roadmaps finish with their
// lessons; learning XP feeds the Learning board. Verdicts go straight to
// submissions.finish, so no runner is needed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

const accepted = { status: "accepted" as const, passed: 3, total: 3, timeMs: 5, tests: [] };

async function seedProblem(t: T, slug: string) {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  const { problemId } = await t.mutation(internal.problems.seed, {
    problem: {
      slug,
      title: slug,
      statement: "…",
      difficulty: "easy",
      tags: [],
      judge: { mode: "stdio" },
      checker: { kind: "exact" },
      examples: [],
      limits: { timeMs: 1000, memoryMb: 256 },
      languages: "all",
      pool: "practice",
      version: 1,
      hints: [],
      status: "beta",
    },
    tests: { file, count: 0 },
  });
  return problemId as Id<"problems">;
}

/**
 * Problems p1 to p4; lessons "one" (p1, p2) and "two" (p3), and the tutorial
 * "solo" (p4); the roadmap "programming-basics" with module "start" (one, two)
 * and module "more" (solo).
 */
async function seedContent(t: T) {
  const ids: Record<string, Id<"problems">> = {};
  for (const slug of ["p1", "p2", "p3", "p4"]) ids[slug] = await seedProblem(t, slug);
  const lesson = (slug: string, exercises: string[], tutorial = false) =>
    t.mutation(internal.learn.seedLesson, { slug, title: slug, summary: "", body: "# Hi", tutorial, exercises });
  await lesson("one", ["p1", "p2"]);
  await lesson("two", ["p3"]);
  await lesson("solo", ["p4"], true);
  await t.mutation(internal.learn.seedRoadmap, {
    slug: "programming-basics",
    title: "Programming basics",
    summary: "",
    intro: "",
    order: 1,
    modules: [
      { slug: "start", title: "Start", summary: "", free: true, lessons: ["one", "two"] },
      { slug: "more", title: "More", summary: "", free: false, lessons: ["solo"] },
    ],
  });
  return ids;
}

async function player(t: T, name: string) {
  const userId = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
  return { userId, as: t.withIdentity(identity(`user_${name}`)) };
}

async function solve(t: T, userId: Id<"users">, problemId: Id<"problems">, language: "python" | "javascript" = "python") {
  const submissionId = await t.run((ctx) =>
    ctx.db.insert("submissions", {
      userId,
      problemId,
      problemVersion: 1,
      language,
      source: "",
      kind: "submit",
      status: "running",
    }),
  );
  await t.mutation(internal.submissions.finish, { submissionId, verdict: accepted });
  return (await t.run((ctx) => ctx.db.get(submissionId)))!;
}

async function badges(t: T, userId: Id<"users">) {
  const rows = await t.run((ctx) =>
    ctx.db
      .query("userBadges")
      .withIndex("by_user_badge", (q) => q.eq("userId", userId))
      .collect(),
  );
  return rows.map((r) => r.badgeId).sort();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("lessons", () => {
  it("finish when opened and every exercise is solved, once, with 15 XP and the First lesson badge", async () => {
    const t = setup();
    const ids = await seedContent(t);
    const ada = await player(t, "ada");

    expect((await ada.as.mutation(api.learn.open, { slug: "one" })).xp).toBe(0);
    const first = await solve(t, ada.userId, ids.p1);
    expect(first.learn).toBeUndefined(); // p2 still to do
    const second = await solve(t, ada.userId, ids.p2);
    expect(second.learn).toEqual({ lessons: [{ slug: "one", title: "one" }], modules: [], xp: 15 });
    expect(second.badgesEarned).toContain("first-lesson");
    // Solving again, in another language, finishes nothing more.
    expect((await solve(t, ada.userId, ids.p2, "javascript")).learn).toBeUndefined();

    const lesson = await ada.as.query(api.learn.lesson, { slug: "one" });
    expect(lesson?.me?.finishedAt).not.toBeNull();
    expect(lesson?.exercises.map((e) => e.solved)).toEqual([true, true]);
    expect(lesson?.place).toMatchObject({ module: { slug: "start", free: true }, position: 1, of: 2, next: { slug: "two" } });
  });

  it("doesn't finish from solves alone: the lesson has to be opened", async () => {
    const t = setup();
    const ids = await seedContent(t);
    const ada = await player(t, "ada");
    expect((await solve(t, ada.userId, ids.p3)).learn).toBeUndefined();
    // Opening it later finishes it at once: earlier solves count.
    const opened = await ada.as.mutation(api.learn.open, { slug: "two" });
    expect(opened.xp).toBe(15);
    expect(opened.badges).toEqual(["first-lesson"]);
    expect((await ada.as.mutation(api.learn.open, { slug: "two" })).xp).toBe(0);
  });
});

describe("modules and roadmaps", () => {
  it("give 100 XP per finished module and the roadmap badge when every module is done", async () => {
    const t = setup();
    const ids = await seedContent(t);
    const ada = await player(t, "ada");
    for (const slug of ["one", "two", "solo"]) await ada.as.mutation(api.learn.open, { slug });

    await solve(t, ada.userId, ids.p1);
    await solve(t, ada.userId, ids.p2);
    const start = await solve(t, ada.userId, ids.p3);
    expect(start.learn).toEqual({
      lessons: [{ slug: "two", title: "two" }],
      modules: [{ roadmap: "programming-basics", module: "start", title: "Start" }],
      xp: 115,
    });
    expect(await badges(t, ada.userId)).not.toContain("roadmap-programming-basics");

    const last = await solve(t, ada.userId, ids.p4);
    expect(last.learn?.xp).toBe(115);
    expect(last.badgesEarned).toContain("roadmap-programming-basics");

    const roadmap = await ada.as.query(api.learn.roadmap, { slug: "programming-basics" });
    expect(roadmap?.modules.map((m) => m.finished)).toEqual([true, true]);
    const overview = await ada.as.query(api.learn.overview, {});
    expect(overview.roadmaps[0]).toMatchObject({ lessons: 3, finished: 3 });
    expect(overview.tutorials.map((tut) => [tut.slug, tut.state])).toEqual([["solo", "finished"]]);
  });
});

describe("the Learning board", () => {
  it("ranks learning XP only, all time and this month, and is cleared on account deletion", async () => {
    const t = setup();
    const ids = await seedContent(t);
    const ada = await player(t, "ada");
    const bob = await player(t, "bob");

    await ada.as.mutation(api.learn.open, { slug: "solo" });
    await solve(t, ada.userId, ids.p4); // 10 solve XP, then 15 + 100 learning XP
    await solve(t, bob.userId, ids.p1); // solve XP only
    await solve(t, bob.userId, ids.p2);

    await t.mutation(internal.leaderboards.rebuildAll, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    for (const board of ["learning", "learning-month"] as const) {
      const result = await ada.as.query(api.leaderboards.board, { board, scope: "global" });
      expect(result.rows.map((r) => [r.name, r.value])).toEqual([["ada", 115]]); // the lesson and its module
      expect(result.me).toEqual({ rank: 1, value: 115 });
    }

    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_ada" });
    const rows = await t.run(async (ctx) => [
      ...(await ctx.db.query("lessonProgress").collect()),
      ...(await ctx.db.query("learningXp").collect()),
    ]);
    expect(rows).toEqual([]);
  });
});
