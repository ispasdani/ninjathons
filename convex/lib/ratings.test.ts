import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import { identity, setup } from "../test.setup";
import { PROVISIONAL_GAMES, recordDuel, tierFor } from "./ratings";

type T = ReturnType<typeof setup>;

async function players(t: T) {
  return await Promise.all(
    ["user_1", "user_2"].map((clerkId) =>
      t.mutation(internal.user.upsertFromClerk, { clerkId, email: `${clerkId}@example.com`, name: clerkId, imageUrl: "" }),
    ),
  );
}

describe("tiers", () => {
  it("follows the design cut-offs", () => {
    expect(tierFor(800)).toBe("Newbie");
    expect(tierFor(1199)).toBe("Newbie");
    expect(tierFor(1200)).toBe("Apprentice");
    expect(tierFor(1500)).toBe("Specialist");
    expect(tierFor(1600)).toBe("Expert");
    expect(tierFor(2199)).toBe("Master");
    expect(tierFor(2200)).toBe("Grandmaster");
  });
});

describe("recordDuel", () => {
  it("rates both players from their ratings before the game", async () => {
    const t = setup();
    const [ada, bob] = await players(t);
    const [win, loss] = await t.run((ctx) => recordDuel(ctx, { a: ada, b: bob, score: 1 }));

    expect(win.change).toBeGreaterThan(0);
    expect(win.change).toBeCloseTo(-loss.change, 6);
    const rows = await t.run((ctx) => ctx.db.query("ratings").collect());
    expect(rows.find((r) => r.userId === ada)).toMatchObject({ area: "1v1", games: 1, wins: 1, losses: 0 });
    expect(rows.find((r) => r.userId === bob)).toMatchObject({ games: 1, wins: 0, losses: 1 });
  });

  it("keeps one row per player and a history entry per game", async () => {
    const t = setup();
    const [ada, bob] = await players(t);
    await t.run(async (ctx) => {
      await recordDuel(ctx, { a: ada, b: bob, score: 1 });
      await recordDuel(ctx, { a: ada, b: bob, score: 0.5 });
      await recordDuel(ctx, { a: bob, b: ada, score: 1 });
    });
    const rows = await t.run((ctx) => ctx.db.query("ratings").collect());
    const history = await t.run((ctx) => ctx.db.query("ratingHistory").collect());
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.userId === ada)).toMatchObject({ games: 3, wins: 1, losses: 1, draws: 1 });
    expect(history).toHaveLength(6);
    expect(history.filter((h) => h.userId === ada).map((h) => h.opponentId)).toEqual([bob, bob, bob]);
  });

  it("refuses a game against yourself", async () => {
    const t = setup();
    const [ada] = await players(t);
    await expect(t.run((ctx) => recordDuel(ctx, { a: ada, b: ada, score: 1 }))).rejects.toThrow();
  });
});

describe("ratings.mine", () => {
  it("is empty before any ranked game", async () => {
    const t = setup();
    await players(t);
    expect(await t.withIdentity(identity("user_1")).query(api.ratings.mine)).toEqual([]);
  });

  it("is provisional until 10 games, with the tier and record", async () => {
    const t = setup();
    const [ada, bob] = await players(t);
    const asAda = t.withIdentity(identity("user_1"));
    await t.run(async (ctx) => {
      for (let i = 0; i < PROVISIONAL_GAMES - 1; i++) await recordDuel(ctx, { a: ada, b: bob, score: 1 });
    });
    const [early] = await asAda.query(api.ratings.mine);
    expect(early).toMatchObject({ area: "1v1", provisional: true, games: 9, wins: 9 });
    expect(early).not.toHaveProperty("rd");
    expect(early.tier).toBe(tierFor(early.rating));

    await t.run((ctx) => recordDuel(ctx, { a: ada, b: bob, score: 1 }));
    const [settled] = await asAda.query(api.ratings.mine);
    expect(settled.provisional).toBe(false);
    expect(Number.isInteger(settled.rating)).toBe(true);
  });
});
