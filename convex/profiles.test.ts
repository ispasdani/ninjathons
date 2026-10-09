// Public profiles (decisions §18): found by username in any case, old
// usernames redirect for their 90 days, provisional ratings stay hidden, and
// nothing private or unfinished is shown.
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { activityStart } from "./profiles";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

const DAY = 24 * 60 * 60 * 1000;

async function player(t: T, name: string, username?: string) {
  const userId = await t
    .withIdentity(identity(`user_${name}`, { name, email: `${name}@example.com` }))
    .mutation(api.user.ensureUser);
  if (username) await t.withIdentity(identity(`user_${name}`)).mutation(api.user.setUsername, { username });
  return userId;
}

/** A profile that exists and isn't a redirect. */
async function profileOf(t: T, username: string) {
  const result = await t.query(api.profiles.get, { username });
  if (!result || result.redirect !== null) throw new Error(`no profile for ${username}`);
  return result;
}

async function seedProblem(t: T) {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  const { problemId } = await t.mutation(internal.problems.seed, {
    problem: {
      slug: "two-sum",
      title: "Two Sum",
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

async function duel(
  t: T,
  problemId: Id<"problems">,
  a: Id<"users">,
  b: Id<"users">,
  opts: { status?: "finished" | "active"; ghostB?: boolean; finishedAt?: number } = {},
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const matchId = await ctx.db.insert("matches", {
      mode: "1v1",
      ranked: true,
      source: opts.ghostB ? "ghost" : "queue",
      status: opts.status ?? "finished",
      problemId,
      problemVersion: 1,
      difficulty: "easy",
      startsAt: now - 60_000,
      endsAt: now + 60_000,
      finishedAt: opts.status === "active" ? undefined : (opts.finishedAt ?? now),
      winnerId: a,
      reason: "solved",
    });
    const base = { matchId, language: "python" as const, ratingBefore: 1500, submits: 1, bestPassed: 3, total: 3 };
    await ctx.db.insert("matchPlayers", { ...base, userId: a, result: "win", counted: true, ratingChange: 12 });
    await ctx.db.insert("matchPlayers", {
      ...base,
      userId: b,
      ghost: opts.ghostB,
      result: opts.ghostB ? undefined : "loss",
      counted: true,
      ratingChange: -12,
    });
    return matchId;
  });
}

describe("profiles.get", () => {
  it("finds a player by username in any case, and nobody else", async () => {
    const t = setup();
    await player(t, "ada", "Ada");
    await player(t, "nameless");

    expect(await t.query(api.profiles.get, { username: "ADA" })).toMatchObject({ redirect: null, username: "Ada" });
    expect(await t.query(api.profiles.get, { username: "grace" })).toBeNull();
  });

  it("redirects an old username to the new one while it's held, then lets it go", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada_new");
    await t.run((ctx) =>
      ctx.db.insert("usernameReservations", { usernameKey: "ada_old", userId: ada, expiresAt: Date.now() + DAY }),
    );
    await t.run((ctx) =>
      ctx.db.insert("usernameReservations", { usernameKey: "ada_older", userId: ada, expiresAt: Date.now() - 1 }),
    );
    // A deleted account's name is held but has nobody to go to.
    await t.run((ctx) => ctx.db.insert("usernameReservations", { usernameKey: "gone", expiresAt: Date.now() + DAY }));

    expect(await t.query(api.profiles.get, { username: "Ada_Old" })).toEqual({ redirect: "ada_new" });
    expect(await t.query(api.profiles.get, { username: "ada_older" })).toBeNull();
    expect(await t.query(api.profiles.get, { username: "gone" })).toBeNull();
  });

  it("shows nothing private", async () => {
    const t = setup();
    await player(t, "ada", "ada");
    const profile = await profileOf(t, "ada");
    const json = JSON.stringify(profile);
    expect(json).not.toContain("ada@example.com");
    expect(json).not.toContain("user_ada");
  });

  it("hides a provisional rating and shows the games left, then the rating and tier", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    const row = { userId: ada, area: "1v1" as const, rating: 1650.4, rd: 80, volatility: 0.06, wins: 3, losses: 1, draws: 0, lastGameAt: 0 };
    const ratingId = await t.run((ctx) => ctx.db.insert("ratings", { ...row, games: 4 }));

    const early = await profileOf(t, "ada");
    expect(early?.stats.duel).toMatchObject({ rating: null, tier: null, placementLeft: 6, record: { wins: 3, losses: 1, draws: 0 } });
    expect(early?.ratingHistory).toEqual([]);

    await t.run((ctx) => ctx.db.patch(ratingId, { games: 10 }));
    await t.run((ctx) => ctx.db.insert("ratingHistory", { userId: ada, area: "1v1", rating: 1650.4, change: 12 }));
    const later = await profileOf(t, "ada");
    expect(later?.stats.duel).toMatchObject({ rating: 1650, tier: "Expert", placementLeft: 0 });
    expect(later?.ratingHistory).toMatchObject([{ rating: 1650 }]);
  });

  it("counts problems solved, badges earned first, and the Pro badge", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    await t.run(async (ctx) => {
      for (const key of ["solve:two-sum:python", "solve:two-sum:javascript", "solve:fizz:python"]) {
        await ctx.db.insert("xpLedger", { userId: ada, key, source: "solve", amount: 10 });
      }
      await ctx.db.insert("userBadges", { userId: ada, badgeId: "polyglot" });
      await ctx.db.insert("entitlements", { userId: ada, tier: "pro", expiresAt: Date.now() + DAY });
    });

    const profile = await profileOf(t, "ada");
    expect(profile?.stats.solved).toBe(2);
    expect(profile?.badges[0]).toMatchObject({ id: "polyglot" });
    expect(profile?.badges[1].earnedAt).toBeNull();
    expect(profile?.pro).toBe(true);
  });

  it("fills the activity grid from accepted Submits", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    const problemId = await seedProblem(t);
    const submissionId = await t.run((ctx) =>
      ctx.db.insert("submissions", {
        userId: ada,
        problemId,
        problemVersion: 1,
        language: "python",
        source: "",
        kind: "submit",
        status: "running",
      }),
    );
    await t.mutation(internal.submissions.finish, {
      submissionId,
      verdict: { status: "accepted", passed: 1, total: 1, timeMs: 5, tests: [] },
    });

    const profile = await profileOf(t, "ada");
    const today = new Date().toISOString().slice(0, 10);
    expect(profile?.activity.days).toEqual({ [today]: 1 });
    expect(profile?.activity.from).toBe(activityStart(Date.now()));
  });

  it("starts the grid on a Monday 25 weeks before this week's", () => {
    // Thursday 8 Oct 2026.
    expect(activityStart(Date.parse("2026-10-08T12:00:00Z"))).toBe("2026-04-13");
  });

  it("lists finished games only, newest first, without this player's ghost runs", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    const bob = await player(t, "bob", "bob");
    const problemId = await seedProblem(t);
    await duel(t, problemId, ada, bob, { finishedAt: Date.now() - DAY });
    await duel(t, problemId, ada, bob, { status: "active" });
    const latest = await duel(t, problemId, ada, bob);
    // Bob raced a recording of Ada: Ada's ghost row isn't her game.
    await duel(t, problemId, bob, ada, { ghostB: true });

    const profile = await profileOf(t, "ada");
    expect(profile?.recent).toHaveLength(2);
    expect(profile?.recent?.[0]).toMatchObject({ kind: "1v1", id: latest, result: "win", opponent: "bob", problem: "Two Sum" });
    // Provisional: no rating change shown.
    expect(profile?.recent?.[0]).toMatchObject({ ratingChange: null });

    const bobs = await profileOf(t, "bob");
    expect(bobs?.recent?.[0]).toMatchObject({ result: "win", opponent: "ada", ghost: true });
  });
});
