// The phase 8 check (decisions §12, §18): every Pro function is called signed
// out and as a free player and refuses, and the last test fails when a
// function that checks Pro has no entry here.
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;
type Caller = ReturnType<T["withIdentity"]> | T;

async function seedProblem(t: T, slug: string) {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  await t.mutation(internal.problems.seed, {
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
}

/** A roadmap with a free module ("intro") and a Pro one ("paid"), plus a tutorial inside the Pro module. */
async function seedRoadmap(t: T) {
  for (const slug of ["p1", "p2", "p3"]) await seedProblem(t, slug);
  const lesson = (slug: string, exercises: string[], tutorial = false) =>
    t.mutation(internal.learn.seedLesson, { slug, title: slug, summary: "s", body: `# ${slug} text`, tutorial, exercises });
  await lesson("intro", ["p1"]);
  await lesson("paid", ["p2"]);
  await lesson("tut", ["p3"], true);
  await t.mutation(internal.learn.seedRoadmap, {
    slug: "dsa",
    title: "DSA",
    summary: "",
    intro: "",
    order: 1,
    modules: [
      { slug: "one", title: "One", summary: "", free: true, lessons: ["intro"] },
      { slug: "two", title: "Two", summary: "", free: false, lessons: ["paid", "tut"] },
    ],
  });
}

async function players(t: T) {
  const free = await t.withIdentity(identity("user_free", { name: "Free" })).mutation(api.user.ensureUser);
  const pro = await t.withIdentity(identity("user_pro", { name: "Pro" })).mutation(api.user.ensureUser);
  const lapsed = await t.withIdentity(identity("user_lapsed", { name: "Lapsed" })).mutation(api.user.ensureUser);
  await t.run(async (ctx) => {
    await ctx.db.insert("entitlements", { userId: pro, tier: "pro", expiresAt: Date.now() + 86_400_000 });
    await ctx.db.insert("entitlements", { userId: lapsed, tier: "pro", expiresAt: Date.now() - 1 });
  });
  return {
    signedOut: t as Caller,
    free: t.withIdentity(identity("user_free")) as Caller,
    lapsed: t.withIdentity(identity("user_lapsed")) as Caller,
    pro: t.withIdentity(identity("user_pro")) as Caller,
    ids: { free, pro, lapsed } as Record<string, Id<"users">>,
  };
}

async function opened(t: T, userId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db
      .query("lessonProgress")
      .withIndex("by_user_finished", (q) => q.eq("userId", userId))
      .collect(),
  );
}

/**
 * Every Pro function, as "file:export", with its denial test. Each one must
 * refuse signed out, as a free player and as a player whose Pro has lapsed,
 * and give the Pro player what the others were refused.
 */
const PRO_FUNCTIONS: Record<string, () => Promise<void>> = {
  "learn:lesson": async () => {
    const t = setup();
    await seedRoadmap(t);
    const who = await players(t);

    for (const caller of [who.signedOut, who.free, who.lapsed]) {
      const lesson = await caller.query(api.learn.lesson, { slug: "paid" });
      expect(lesson).toMatchObject({ locked: true, body: null, title: "paid", summary: "s" });
      expect(JSON.stringify(lesson)).not.toContain("paid text");
      // The outline stays: the exercises and the place in the roadmap.
      expect(lesson?.exercises.map((e) => e.slug)).toEqual(["p2"]);
      expect(lesson?.place?.module.slug).toBe("two");
    }
    expect(await who.pro.query(api.learn.lesson, { slug: "paid" })).toMatchObject({ locked: false, body: "# paid text" });

    // The free module and tutorials, even inside a Pro module, stay open to everyone.
    for (const slug of ["intro", "tut"]) {
      expect(await who.signedOut.query(api.learn.lesson, { slug })).toMatchObject({ locked: false, body: `# ${slug} text` });
    }
  },

  "learn:open": async () => {
    const t = setup();
    await seedRoadmap(t);
    const who = await players(t);

    await expect(who.signedOut.mutation(api.learn.open, { slug: "paid" })).rejects.toThrowError("UNAUTHENTICATED");
    await expect(who.free.mutation(api.learn.open, { slug: "paid" })).rejects.toThrowError("PRO_REQUIRED");
    await expect(who.lapsed.mutation(api.learn.open, { slug: "paid" })).rejects.toThrowError("PRO_REQUIRED");
    expect(await opened(t, who.ids.free)).toHaveLength(0);
    expect(await opened(t, who.ids.lapsed)).toHaveLength(0);

    await who.pro.mutation(api.learn.open, { slug: "paid" });
    expect(await opened(t, who.ids.pro)).toHaveLength(1);
    // Free lessons open for free players.
    await who.free.mutation(api.learn.open, { slug: "intro" });
    await who.free.mutation(api.learn.open, { slug: "tut" });
    expect(await opened(t, who.ids.free)).toHaveLength(2);
  },
};

const custom = { accent: "#e11d48", banner: "dots", headingFont: "fraunces", sections: { order: ["recent", "about"], hidden: ["badges"] } };

/** Gives each player a username and a saved profile using every Pro option. */
async function savedProProfiles(t: T, ids: Record<string, Id<"users">>) {
  await t.run(async (ctx) => {
    for (const [name, userId] of Object.entries(ids)) {
      await ctx.db.patch(userId, { username: name, usernameKey: name });
      await ctx.db.insert("profiles", { userId, theme: "terminal", freeTheme: "slate", ...custom });
    }
  });
}

Object.assign(PRO_FUNCTIONS, {
  "learn:roadmap": async () => {
    const t = setup();
    await seedRoadmap(t);
    const who = await players(t);
    const lockedOf = async (caller: Caller) => {
      const roadmap = await caller.query(api.learn.roadmap, { slug: "dsa" });
      return Object.fromEntries(roadmap!.modules.flatMap((m) => m.lessons.map((l) => [l.slug, l.locked])));
    };

    // The free module and the tutorial are open to everyone; the Pro lesson only to Pro.
    for (const caller of [who.signedOut, who.free, who.lapsed]) {
      expect(await lockedOf(caller)).toEqual({ intro: false, paid: true, tut: false });
    }
    expect(await lockedOf(who.pro)).toEqual({ intro: false, paid: false, tut: false });
  },

  "profiles:get": async () => {
    const t = setup();
    const who = await players(t);
    await savedProProfiles(t, who.ids);

    // Whoever looks, a free or lapsed player's Pro values aren't shown: their last free theme is.
    for (const viewer of [who.signedOut, who.pro]) {
      for (const owner of ["free", "lapsed"]) {
        const profile = await viewer.query(api.profiles.get, { username: owner });
        expect(profile).toMatchObject({
          look: { theme: "slate", accent: null, banner: "none", headingFont: "geist", sections: { hidden: [] } },
        });
      }
    }
    expect(await who.signedOut.query(api.profiles.get, { username: "pro" })).toMatchObject({
      look: { theme: "terminal", accent: "#e11d48", banner: "dots", headingFont: "fraunces", sections: { hidden: ["badges"] } },
    });
  },

  "profiles:saveTheme": async () => {
    const t = setup();
    const who = await players(t);

    await expect(who.signedOut.mutation(api.profiles.saveTheme, { theme: "terminal" })).rejects.toThrowError("UNAUTHENTICATED");
    await expect(who.free.mutation(api.profiles.saveTheme, { theme: "terminal" })).rejects.toThrowError("PRO_REQUIRED");
    await expect(who.lapsed.mutation(api.profiles.saveTheme, { theme: "terminal" })).rejects.toThrowError("PRO_REQUIRED");
    // Earned themes need their badge.
    await expect(who.free.mutation(api.profiles.saveTheme, { theme: "royal" })).rejects.toThrowError("THEME_LOCKED");
    expect(await t.run((ctx) => ctx.db.query("profiles").collect())).toHaveLength(0);

    await who.free.mutation(api.profiles.saveTheme, { theme: "slate" });
    await who.pro.mutation(api.profiles.saveTheme, { theme: "terminal" });
    const rows = await t.run((ctx) => ctx.db.query("profiles").collect());
    expect(rows.map((r) => r.theme).sort()).toEqual(["slate", "terminal"]);
  },

  "profiles:saveCustom": async () => {
    const t = setup();
    const who = await players(t);

    await expect(who.signedOut.mutation(api.profiles.saveCustom, custom)).rejects.toThrowError("UNAUTHENTICATED");
    await expect(who.free.mutation(api.profiles.saveCustom, custom)).rejects.toThrowError("PRO_REQUIRED");
    await expect(who.lapsed.mutation(api.profiles.saveCustom, custom)).rejects.toThrowError("PRO_REQUIRED");
    expect(await t.run((ctx) => ctx.db.query("profiles").collect())).toHaveLength(0);

    await who.pro.mutation(api.profiles.saveCustom, custom);
    const [row] = await t.run((ctx) => ctx.db.query("profiles").collect());
    expect(row).toMatchObject({ userId: who.ids.pro, accent: "#e11d48", banner: "dots", headingFont: "fraunces" });
  },
} satisfies Record<string, () => Promise<void>>);

describe("every Pro function refuses free players", () => {
  for (const [name, test] of Object.entries(PRO_FUNCTIONS)) it(name, test);
});

// --- Finding the Pro functions in the source ---

const sources = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./_generated/**", "!./test.setup.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// What marks code as checking Pro. Helpers that use one of these (like
// learn.ts's lessonLocked) are added to the list below as they're found.
const PRO_MARKERS = ["proQuery", "proMutation", "hasPro", "requirePro"];
const BUILDERS = /^(publicQuery|userQuery|userMutation|userAction|identityMutation|proQuery|proMutation)\(/;

/** Top-level declarations of a file: name, whether it's an exported Convex function, and its text. */
function declarations(raw: string) {
  // Comments mention the markers without calling them.
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const starts = [...source.matchAll(/^(?:export )?(?:async )?(?:function|const) (\w+)/gm)];
  return starts.map((match, i) => {
    const text = source.slice(match.index, starts[i + 1]?.index ?? source.length);
    const rhs = text.replace(/^[^=]*=\s*/, "");
    return {
      name: match[1],
      exported: match[0].startsWith("export const") && BUILDERS.test(rhs),
      text,
    };
  });
}

function proFunctions() {
  const files = Object.entries(sources).map(([path, source]) => ({
    module: path.replace(/^\.\//, "").replace(/\.ts$/, ""),
    decls: declarations(source),
  }));
  // Lib files that define the markers themselves aren't callers.
  const markers = new Set(PRO_MARKERS);
  for (let grew = true; grew; ) {
    grew = false;
    for (const { decls } of files) {
      for (const d of decls) {
        if (d.exported || markers.has(d.name)) continue;
        const body = d.text.slice(d.text.indexOf(d.name) + d.name.length);
        if ([...markers].some((m) => new RegExp(`\\b${m}\\b`).test(body))) {
          markers.add(d.name);
          grew = true;
        }
      }
    }
  }
  const found: string[] = [];
  for (const { module, decls } of files) {
    if (module.startsWith("lib/")) continue;
    for (const d of decls) {
      if (d.exported && [...markers].some((m) => new RegExp(`\\b${m}\\b`).test(d.text))) found.push(`${module}:${d.name}`);
    }
  }
  return found.sort();
}

describe("the denial tests cover every Pro function", () => {
  it("finds the known ones", () => {
    expect(proFunctions()).toEqual(expect.arrayContaining(["learn:lesson", "learn:open"]));
  });

  it("has a denial test for each one", () => {
    expect(proFunctions()).toEqual(Object.keys(PRO_FUNCTIONS).sort());
  });
});
