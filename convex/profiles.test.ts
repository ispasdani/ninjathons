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

async function seedProblem(t: T, slug = "two-sum") {
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  const { problemId } = await t.mutation(internal.problems.seed, {
    problem: {
      slug,
      title: slug === "two-sum" ? "Two Sum" : slug,
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

async function accepted(t: T, userId: Id<"users">, problemId: Id<"problems">, source = "print(1)") {
  return await t.run((ctx) =>
    ctx.db.insert("submissions", {
      userId,
      problemId,
      problemVersion: 1,
      language: "python",
      source,
      kind: "submit",
      status: "done",
      verdict: { status: "accepted", passed: 1, total: 1, timeMs: 5, tests: [] },
    }),
  );
}

describe("the free fields", () => {
  it("saves a plain-text bio, https links and up to 3 languages", async () => {
    const t = setup();
    await player(t, "ada", "ada");
    const as = t.withIdentity(identity("user_ada"));

    await as.mutation(api.profiles.saveAbout, {
      bio: "  Hi\u0007 there\n\n\n\nfriend  ",
      links: ["https://github.com/ada", " https://ada.dev ", "", "https://github.com/ada"],
      languages: ["python", "rust", "python"],
    });

    const profile = await profileOf(t, "ada");
    expect(profile.about).toEqual({
      bio: "Hi there\n\nfriend",
      links: ["https://github.com/ada", "https://ada.dev/"],
      languages: ["python", "rust"],
    });
  });

  it("refuses links that aren't https, long bios and too many of anything", async () => {
    const t = setup();
    await player(t, "ada", "ada");
    const as = t.withIdentity(identity("user_ada"));
    const save = (fields: Partial<{ bio: string; links: string[]; languages: ("python" | "rust" | "java" | "cpp")[] }>) =>
      as.mutation(api.profiles.saveAbout, { bio: "", links: [], languages: [], ...fields });

    for (const link of ["javascript:alert(1)", "http://ada.dev", "https://localhost", "https://user:pw@ada.dev", "data:text/html,hi", "ada.dev"]) {
      await expect(save({ links: [link] })).rejects.toThrowError("BAD_LINK");
    }
    await expect(save({ bio: "x".repeat(161) })).rejects.toThrowError("BIO_TOO_LONG");
    await expect(save({ links: ["https://a.dev", "https://b.dev", "https://c.dev", "https://d.dev", "https://e.dev"] })).rejects.toThrowError(
      "TOO_MANY_LINKS",
    );
    await expect(save({ languages: ["python", "rust", "java", "cpp"] })).rejects.toThrowError("TOO_MANY_LANGUAGES");
    expect(await t.run((ctx) => ctx.db.query("profiles").collect())).toHaveLength(0);
  });
});

describe("pinned solutions", () => {
  it("pins your own accepted Submits, one per problem, up to 3, and shows their code", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    const as = t.withIdentity(identity("user_ada"));
    const problems = [];
    for (const slug of ["a", "b", "c", "d"]) problems.push(await seedProblem(t, slug));

    const first = await accepted(t, ada, problems[0], "v1");
    const again = await accepted(t, ada, problems[0], "v2");
    await as.mutation(api.profiles.pin, { submissionId: first });
    await as.mutation(api.profiles.pin, { submissionId: again });
    await as.mutation(api.profiles.pin, { submissionId: await accepted(t, ada, problems[1]) });
    await as.mutation(api.profiles.pin, { submissionId: await accepted(t, ada, problems[2]) });
    await expect(as.mutation(api.profiles.pin, { submissionId: await accepted(t, ada, problems[3]) })).rejects.toThrowError(
      "PINS_FULL",
    );

    const profile = await profileOf(t, "ada");
    expect(profile.pins.map((p) => p.slug)).toEqual(["a", "b", "c"]);
    expect(profile.pins[0]).toMatchObject({ language: "python", source: "v2" });

    await as.mutation(api.profiles.unpin, { problemId: problems[1] });
    expect((await profileOf(t, "ada")).pins.map((p) => p.slug)).toEqual(["a", "c"]);
  });

  it("refuses someone else's Submit, a Run and a failed Submit", async () => {
    const t = setup();
    await player(t, "ada", "ada");
    const bob = await player(t, "bob", "bob");
    const problemId = await seedProblem(t);
    const as = t.withIdentity(identity("user_ada"));

    const bobs = await accepted(t, bob, problemId);
    const run = await accepted(t, bob, problemId);
    await t.run((ctx) => ctx.db.patch(run, { kind: "run" }));
    const failed = await accepted(t, bob, problemId);
    await t.run((ctx) =>
      ctx.db.patch(failed, { verdict: { status: "wrong_answer", passed: 0, total: 1, timeMs: 5, tests: [] } }),
    );
    const asBob = t.withIdentity(identity("user_bob"));
    await expect(as.mutation(api.profiles.pin, { submissionId: bobs })).rejects.toThrowError("NOT_PINNABLE");
    await expect(asBob.mutation(api.profiles.pin, { submissionId: run })).rejects.toThrowError("NOT_PINNABLE");
    await expect(asBob.mutation(api.profiles.pin, { submissionId: failed })).rejects.toThrowError("NOT_PINNABLE");
  });

  it("won't pin today's daily, and hides a pin while its problem is held", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    const as = t.withIdentity(identity("user_ada"));
    const daily = await seedProblem(t, "daily-one");
    const later = await seedProblem(t, "later");
    const today = new Date().toISOString().slice(0, 10);
    await t.run((ctx) => ctx.db.insert("dailyChallenges", { day: today, problemId: daily }));

    await expect(as.mutation(api.profiles.pin, { submissionId: await accepted(t, ada, daily) })).rejects.toThrowError("PIN_HELD");

    await as.mutation(api.profiles.pin, { submissionId: await accepted(t, ada, later) });
    expect((await profileOf(t, "ada")).pins).toHaveLength(1);
    // The problem joins a weekly set that hasn't started: its pin is hidden until the week is over.
    await t.run((ctx) =>
      ctx.db.insert("weeklySets", { slug: "w", title: "W", theme: "", order: 1, problemIds: [later] }),
    );
    expect((await profileOf(t, "ada")).pins).toHaveLength(0);
  });

  it("lists what you could pin in the editor, newest per problem", async () => {
    const t = setup();
    const ada = await player(t, "ada", "ada");
    const problemId = await seedProblem(t);
    await accepted(t, ada, problemId, "old");
    const newest = await accepted(t, ada, problemId, "new");

    const editor = await t.withIdentity(identity("user_ada")).query(api.profiles.editor, {});
    expect(editor.candidates).toMatchObject([{ submissionId: newest, title: "Two Sum", held: false }]);
    expect(editor.unlocked).toEqual(["default", "slate", "ink"]);
  });
});
