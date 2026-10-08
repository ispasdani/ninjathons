// @vitest-environment node
// HTML and CSS challenges (decisions §17): the browser judges, web.submit
// records it, gives the solve XP once and counts for lessons; the code
// runner, the daily and the matches never see them.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

const files = { html: "<h1>Hi</h1>", css: "" };

async function seedWeb(t: T, slug = "web-one") {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  await t.mutation(internal.problems.seed, {
    problem: {
      slug,
      title: slug,
      statement: "…",
      difficulty: "easy",
      tags: ["html"],
      judge: {
        mode: "web",
        edit: ["html"],
        target: files,
        starter: { html: "", css: "" },
        // 2 checks at 2 widths: 4 results in a real run.
        checks: [{ selector: "h1", text: true }, { selector: "p" }],
        viewports: [800, 320],
      },
      checker: { kind: "exact" },
      examples: [],
      limits: { timeMs: 1000, memoryMb: 64 },
      languages: [],
      pool: "practice",
      version: 1,
      hints: [],
      status: "beta",
    },
    tests: { file, count: 0 },
  });
}

async function player(t: T, name: string) {
  const userId = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
  return { userId, as: t.withIdentity(identity(`user_${name}`)) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("web challenges", () => {
  it("give solve XP once for an accepted Submit, keyed by the web language", async () => {
    const t = setup();
    await seedWeb(t);
    const ada = await player(t, "ada");

    const wrong = await ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 3, total: 4 });
    expect(wrong).toMatchObject({ accepted: false, xp: null });

    vi.advanceTimersByTime(5000);
    const right = await ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 4, total: 4 });
    expect(right).toMatchObject({ accepted: true, xp: 10 });
    expect(right.badges).toContain("first-solve");
    const keys = await t.run(async (ctx) => (await ctx.db.query("xpLedger").collect()).map((e) => e.key));
    expect(keys).toEqual(["solve:web-one:web"]);

    vi.advanceTimersByTime(5000);
    expect(await ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 4, total: 4 })).toMatchObject({
      accepted: true,
      xp: 0,
    });
    const library = await ada.as.query(api.problems.library, {});
    expect(library).toEqual([expect.objectContaining({ slug: "web-one", mode: "web", status: "solved" })]);
  });

  it("refuse a verdict no real run gives, Submits too close together, and the code runner", async () => {
    const t = setup();
    await seedWeb(t);
    const ada = await player(t, "ada");
    await expect(ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 2, total: 2 })).rejects.toThrow(
      "BAD_VERDICT",
    );
    await ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 0, total: 4 });
    await expect(ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 4, total: 4 })).rejects.toThrow(
      "SUBMIT_COOLDOWN",
    );
    await expect(
      ada.as.mutation(api.submissions.create, { slug: "web-one", language: "javascript", source: "", kind: "submit" }),
    ).rejects.toThrow("LANGUAGE_NOT_ALLOWED");
  });

  it("finish a lesson waiting on them, and are never the daily", async () => {
    const t = setup();
    await seedWeb(t);
    await t.mutation(internal.learn.seedLesson, {
      slug: "html-intro",
      title: "HTML intro",
      summary: "",
      body: "…",
      tutorial: true,
      exercises: ["web-one"],
    });
    const ada = await player(t, "ada");
    await ada.as.mutation(api.learn.open, { slug: "html-intro" });
    const result = await ada.as.mutation(api.web.submit, { slug: "web-one", ...files, passed: 4, total: 4 });
    expect(result.learn?.lessons).toEqual([{ slug: "html-intro", title: "HTML intro" }]);
    expect(result.xp).toBe(25);

    await t.mutation(internal.daily.pick, {});
    expect(await t.run((ctx) => ctx.db.query("dailyChallenges").collect())).toEqual([]);
  });
});
