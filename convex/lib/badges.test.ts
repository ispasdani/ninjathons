import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { identity, setup } from "../test.setup";
import { BADGES, checkLevelBadges, checkMatchBadges, checkSolveBadges, grantBadge } from "./badges";
import { xpForLevel } from "./levels";
import { awardXp } from "./xp";

type T = ReturnType<typeof setup>;

async function insertUser(t: T, clerkId: string) {
  return await t.mutation(internal.user.upsertFromClerk, {
    clerkId,
    email: `${clerkId}@example.com`,
    name: clerkId,
    imageUrl: "",
  });
}

/** Ledger entries for `count` problems in each language, as solves write them. */
async function solved(t: T, userId: Id<"users">, count: number, languages: string[]) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      for (const language of languages) {
        await ctx.db.insert("xpLedger", { userId, key: `solve:p${i}:${language}`, source: "solve", amount: 10 });
      }
    }
  });
}

const check = (t: T, userId: Id<"users">, difficulty: "easy" | "medium" | "hard" = "easy") =>
  t.run((ctx) => checkSolveBadges(ctx, userId, { difficulty }));

describe("badge definitions", () => {
  it("has the 21 phase 3 badges and the 7 for 1v1, with unique ids", () => {
    expect(BADGES).toHaveLength(28);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(28);
    expect(BADGES.map((b) => b.id)).toContain("language-python");
    expect(BADGES.map((b) => b.id)).toContain("title-legend");
    expect(BADGES.map((b) => b.id)).not.toContain("title-initiate");
    expect(BADGES.map((b) => b.id)).toContain("tier-grandmaster");
    expect(BADGES.map((b) => b.id)).not.toContain("tier-newbie");
  });
});

describe("grantBadge", () => {
  it("grants once and counts holders", async () => {
    const t = setup();
    const ada = await insertUser(t, "user_1");
    const bob = await insertUser(t, "user_2");
    expect(await t.run((ctx) => grantBadge(ctx, ada, "first-solve"))).toBe(true);
    expect(await t.run((ctx) => grantBadge(ctx, ada, "first-solve"))).toBe(false);
    await t.run((ctx) => grantBadge(ctx, bob, "first-solve"));
    const counts = await t.run((ctx) => ctx.db.query("badgeCounts").collect());
    expect(counts).toEqual([expect.objectContaining({ badgeId: "first-solve", holders: 2 })]);
    expect(await t.run((ctx) => ctx.db.query("userBadges").collect())).toHaveLength(2);
  });
});

describe("solve badges", () => {
  it("gives nothing before the first solve", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    expect(await check(t, userId)).toEqual([]);
  });

  it("counts different problems, not languages, for milestones", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    await solved(t, userId, 5, ["python", "java"]);
    expect(await check(t, userId)).toEqual(["first-solve"]);
    await solved(t, userId, 10, ["python"]);
    expect(await check(t, userId)).toEqual(["solves-10"]);
  });

  it("gives First hard for a hard problem", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    await solved(t, userId, 1, ["python"]);
    expect(await check(t, userId, "hard")).toEqual(["first-solve", "first-hard"]);
  });

  it("gives a language badge at 50 solves in it", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    await solved(t, userId, 49, ["rust"]);
    expect(await check(t, userId)).not.toContain("language-rust");
    await solved(t, userId, 50, ["rust"]);
    expect(await check(t, userId)).toEqual(["solves-50", "language-rust"]);
  });

  it("gives Polyglot at 5 languages", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    await solved(t, userId, 1, ["javascript", "python", "java", "cpp"]);
    expect(await check(t, userId)).not.toContain("polyglot");
    await solved(t, userId, 1, ["rust"]);
    expect(await check(t, userId)).toEqual(["polyglot"]);
  });
});

describe("level badges", () => {
  it("gives every title band reached, Initiate excepted", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    expect(await t.run((ctx) => checkLevelBadges(ctx, userId, xpForLevel(5) - 1))).toEqual([]);
    expect(await t.run((ctx) => checkLevelBadges(ctx, userId, xpForLevel(20)))).toEqual([
      "title-coder",
      "title-debugger",
      "title-builder",
      "title-engineer",
    ]);
  });

  it("are checked when XP is awarded", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    const result = await t.run((ctx) =>
      awardXp(ctx, { userId, key: "ninjathon:e1", source: "ninjathon", amount: xpForLevel(5) }),
    );
    expect(result.badges).toEqual(["title-coder"]);
  });
});

describe("badges.list", () => {
  it("shows rarity among players and what the caller earned", async () => {
    const t = setup();
    const ada = await insertUser(t, "user_1");
    const bob = await insertUser(t, "user_2");
    await insertUser(t, "user_3"); // never solved: not counted as a player
    await t.run(async (ctx) => {
      await grantBadge(ctx, ada, "first-solve");
      await grantBadge(ctx, bob, "first-solve");
      await grantBadge(ctx, ada, "first-hard");
    });

    const mine = await t.withIdentity(identity("user_1")).query(api.badges.list);
    const hard = mine.find((b) => b.id === "first-hard");
    expect(hard).toMatchObject({ rarity: 0.5, earnedAt: expect.any(Number) });
    expect(mine.find((b) => b.id === "first-solve")?.rarity).toBe(1);
    expect(mine.find((b) => b.id === "polyglot")).toMatchObject({ rarity: 0, earnedAt: null });

    const signedOut = await t.query(api.badges.list);
    expect(signedOut.every((b) => b.earnedAt === null)).toBe(true);
  });
});

describe("checkMatchBadges", () => {
  it("gives tier badges up to the rating's tier only once it's no longer provisional", async () => {
    const t = setup();
    const ada = await insertUser(t, "user_1");
    const provisional = await t.run((ctx) =>
      checkMatchBadges(ctx, ada, { rankedWin: false, comeback: false, rating: { rating: 1700, games: 9 } }),
    );
    expect(provisional).toEqual([]);
    const settled = await t.run((ctx) =>
      checkMatchBadges(ctx, ada, { rankedWin: false, comeback: false, rating: { rating: 1700, games: 10 } }),
    );
    expect(settled).toEqual(["tier-apprentice", "tier-specialist", "tier-expert"]);
  });

  it("gives Comeback only with a ranked win", async () => {
    const t = setup();
    const ada = await insertUser(t, "user_1");
    expect(await t.run((ctx) => checkMatchBadges(ctx, ada, { rankedWin: false, comeback: true }))).toEqual([]);
    expect(await t.run((ctx) => checkMatchBadges(ctx, ada, { rankedWin: true, comeback: true }))).toEqual([
      "first-ranked-win",
      "comeback-win",
    ]);
  });
});
