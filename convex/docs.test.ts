// @vitest-environment node
// The docs library (decisions §17): importing a set replaces the last import,
// search puts featured pages first with no query and exact names first with
// one, and doc pages opened in a 1v1 match are counted on its result (§9).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createMatch } from "./lib/matches";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

function docPage(path: string, title: string, extra: { featured?: boolean; body?: string; area?: "javascript" | "python" } = {}) {
  return {
    path,
    title,
    breadcrumb: ["JavaScript"],
    area: extra.area ?? ("javascript" as const),
    body: extra.body ?? `About ${title}.`,
    sourceUrl: `https://example.com/${path}`,
    featured: extra.featured ?? false,
  };
}

async function importSet(t: T, pages: ReturnType<typeof docPage>[]) {
  const upload = await t.run((ctx) =>
    ctx.storage.store(new Blob([JSON.stringify({ set: "mdn", version: "test", license: "CC-BY-SA 2.5", pages })])),
  );
  return await t.action(internal.docs.seedFromUpload, { upload });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("importing", () => {
  it("writes the pages, then a later import replaces them and removes what it dropped", async () => {
    const t = setup();
    expect(await importSet(t, [docPage("a/map", "Map", { featured: true }), docPage("a/set", "Set")])).toEqual({
      written: 2,
      removed: 0,
    });
    vi.advanceTimersByTime(1000);
    expect(await importSet(t, [docPage("a/map", "Map", { body: "New text." })])).toEqual({ written: 1, removed: 1 });

    const map = await t.query(api.docs.page, { set: "mdn", path: "a/map" });
    expect(map).toMatchObject({ title: "Map", body: "New text.", license: "CC-BY-SA 2.5", version: "test" });
    expect(await t.query(api.docs.page, { set: "mdn", path: "a/set" })).toBeNull();
  });
});

describe("searching", () => {
  it("lists featured pages with no query, and puts an exact name first", async () => {
    const t = setup();
    await importSet(t, [
      docPage("map", "Map", { featured: true, body: "A map holds key-value pairs." }),
      docPage("map/get", "Map.prototype.get()", { body: "Returns a value from the map." }),
      // convex-test tokenizes "Array.prototype.map()" as one word (Convex itself splits it), so the body says map.
      docPage("array/map", "Array.prototype.map()", { body: "Calls a function on every element: a map." }),
      docPage("heapq", "heapq", { area: "python", featured: true }),
    ]);
    const featured = await t.query(api.docs.search, { areas: ["javascript"], q: "" });
    expect(featured.map((r) => r.title)).toEqual(["Map"]);

    const found = await t.query(api.docs.search, { areas: ["javascript"], q: "map" });
    expect(found[0].title).toBe("Map");
    expect(found.map((r) => r.title)).toContain("Array.prototype.map()");
    // Python pages stay out of a JavaScript search.
    expect(found.map((r) => r.title)).not.toContain("heapq");
  });
});

describe("docs in a 1v1 match", () => {
  it("counts each page once per player on the result, only while the match is on", async () => {
    const t = setup();
    await importSet(t, [docPage("array/map", "Array.prototype.map()"), docPage("array/filter", "Array.prototype.filter()")]);
    const pages = await t.run((ctx) => ctx.db.query("docPages").collect());
    const [ada, bob] = await Promise.all(
      ["ada", "bob"].map((name) => t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser)),
    );
    const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
    await t.mutation(internal.problems.seed, {
      problem: {
        slug: "add",
        title: "Add",
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
    const matchId = (await t.run((ctx) =>
      createMatch(ctx, {
        players: [
          { userId: ada, language: "javascript" },
          { userId: bob, language: "python" },
        ],
        ranked: false,
        source: "queue",
      }),
    )) as Id<"matches">;
    await t.run((ctx) => ctx.db.patch(matchId, { status: "active", endsAt: Date.now() + 60_000 }));

    const asAda = t.withIdentity(identity("user_ada"));
    for (const page of [pages[0], pages[0], pages[1]]) await asAda.mutation(api.docs.noteMatchView, { matchId, pageId: page._id });
    await t.run((ctx) => ctx.db.patch(matchId, { status: "finished", winnerId: ada, finishedAt: Date.now() }));
    // Too late: the match is over.
    await t.withIdentity(identity("user_bob")).mutation(api.docs.noteMatchView, { matchId, pageId: pages[0]._id });

    const result = await t.query(api.matches.result, { id: matchId });
    const used = Object.fromEntries(result!.players.map((p) => [p.language, p.docPages]));
    expect(used).toEqual({ javascript: 2, python: 0 });
  });
});
