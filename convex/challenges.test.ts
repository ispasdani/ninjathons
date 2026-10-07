// @vitest-environment node
// Challenges: by username and by link, ranked limits, expiry, accept and decline.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { CHALLENGE_TTL_MS, MAX_PENDING } from "./challenges";
import { identity, setup } from "./test.setup";

const problem = {
  slug: "add",
  title: "Add",
  statement: "Return a + b.",
  difficulty: "medium" as const,
  tags: [],
  judge: { mode: "stdio" as const },
  checker: { kind: "exact" as const },
  examples: [{ input: "1 2", output: "3" }],
  limits: { timeMs: 2000, memoryMb: 256 },
  languages: "all" as const,
  pool: "practice" as const,
  version: 1,
  hints: [],
  status: "beta" as const,
};

async function seeded() {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  await t.mutation(internal.problems.seed, { problem, tests: { file, count: 0 } });
  const users: Record<string, { id: Id<"users">; as: ReturnType<typeof t.withIdentity> }> = {};
  for (const name of ["ada", "bob", "cyd"]) {
    const id = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
    const as = t.withIdentity(identity(`user_${name}`));
    await as.mutation(api.user.setUsername, { username: name });
    users[name] = { id, as };
  }
  async function rate(name: string, rating: number, games = 20) {
    await t.run((ctx) =>
      ctx.db.insert("ratings", {
        userId: users[name].id,
        area: "1v1",
        rating,
        rd: 80,
        volatility: 0.06,
        games,
        wins: 0,
        losses: 0,
        draws: 0,
        lastGameAt: Date.now(),
      }),
    );
  }
  return { t, users, rate };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("challenges", () => {
  it("sends an unranked challenge by username; accepting starts the match", async () => {
    const { users } = await seeded();
    const { code } = await users.ada.as.mutation(api.challenges.create, {
      username: "@Bob",
      ranked: false,
      difficulty: "medium",
      language: "python",
    });
    const incoming = (await users.bob.as.query(api.challenges.mine)).incoming;
    expect(incoming).toMatchObject([{ from: "ada", ranked: false, difficulty: "medium" }]);
    expect((await users.ada.as.query(api.challenges.mine)).outgoing).toMatchObject([{ to: "bob" }]);
    // Someone else can't see or take it.
    expect(await users.cyd.as.query(api.challenges.get, { code })).toBeNull();
    await expect(users.cyd.as.mutation(api.challenges.accept, { code, language: "java" })).rejects.toThrow(
      "CHALLENGE_NOT_FOUND",
    );

    const matchId = await users.bob.as.mutation(api.challenges.accept, { code: code.toLowerCase(), language: "java" });
    const match = await users.ada.as.query(api.matches.get, { id: matchId });
    expect(match).toMatchObject({ ranked: false, source: "challenge", status: "countdown", difficulty: "medium" });
    expect(match?.players.map((p) => p.language).sort()).toEqual(["java", "python"]);
    expect(await users.ada.as.query(api.challenges.get, { code })).toMatchObject({ status: "accepted", matchId });
    expect((await users.bob.as.query(api.challenges.mine)).incoming).toEqual([]);
  });

  it("explains a bad username, yourself and a duplicate", async () => {
    const { users } = await seeded();
    const send = (username: string) =>
      users.ada.as.mutation(api.challenges.create, { username, ranked: false, language: "python" });
    await expect(send("nobody")).rejects.toThrow("UNKNOWN_PLAYER");
    await expect(send("ada")).rejects.toThrow("CHALLENGE_SELF");
    await send("bob");
    await expect(send("bob")).rejects.toThrow("DUPLICATE_CHALLENGE");
  });

  it("makes a link anyone but the sender can accept, once", async () => {
    const { users } = await seeded();
    const { code } = await users.ada.as.mutation(api.challenges.create, { ranked: false, language: "python" });
    expect(await users.ada.as.query(api.challenges.get, { code })).toMatchObject({ mine: true, problem: "OWN_CHALLENGE" });
    expect(await users.cyd.as.query(api.challenges.get, { code })).toMatchObject({ from: "ada", problem: null });
    await expect(users.ada.as.mutation(api.challenges.accept, { code, language: "python" })).rejects.toThrow(
      "OWN_CHALLENGE",
    );
    await users.cyd.as.mutation(api.challenges.accept, { code, language: "rust" });
    await expect(users.bob.as.mutation(api.challenges.accept, { code, language: "rust" })).rejects.toThrow(
      "CHALLENGE_NOT_FOUND",
    );
  });

  it("expires after 15 minutes", async () => {
    const { users } = await seeded();
    const { code } = await users.ada.as.mutation(api.challenges.create, {
      username: "bob",
      ranked: false,
      language: "python",
    });
    vi.advanceTimersByTime(CHALLENGE_TTL_MS);
    expect((await users.bob.as.query(api.challenges.mine)).incoming).toEqual([]);
    await expect(users.bob.as.mutation(api.challenges.accept, { code, language: "python" })).rejects.toThrow(
      "CHALLENGE_EXPIRED",
    );
  });

  it("holds ranked challenges to 10 games each and a gap under 400", async () => {
    const { users, rate } = await seeded();
    const ranked = (username?: string) =>
      users.ada.as.mutation(api.challenges.create, { username, ranked: true, language: "python" });
    await expect(ranked("bob")).rejects.toThrow("RANKED_NEEDS_GAMES");
    await rate("ada", 1500);
    await expect(ranked("bob")).rejects.toThrow("OPPONENT_NEEDS_GAMES");
    await rate("bob", 1900);
    await expect(ranked("bob")).rejects.toThrow("RATING_GAP");
    await rate("cyd", 1600);
    const { code } = await ranked("cyd");
    const matchId = await users.cyd.as.mutation(api.challenges.accept, { code, language: "python" });
    expect(await users.ada.as.query(api.matches.get, { id: matchId })).toMatchObject({ ranked: true });

    // A ranked link checks the one who opens it.
    const link = await users.bob.as.mutation(api.challenges.create, { ranked: true, language: "python" });
    expect(await users.ada.as.query(api.challenges.get, { code: link.code })).toMatchObject({ problem: "RATING_GAP" });
  });

  it("limits open challenges, and cancels them when the sender's match starts", async () => {
    const { users } = await seeded();
    for (let i = 0; i < MAX_PENDING; i++) {
      await users.ada.as.mutation(api.challenges.create, { ranked: false, language: "python" });
    }
    await expect(users.ada.as.mutation(api.challenges.create, { ranked: false, language: "python" })).rejects.toThrow(
      "TOO_MANY_CHALLENGES",
    );
    const { code } = await users.bob.as.mutation(api.challenges.create, { username: "ada", ranked: false, language: "python" });
    await users.ada.as.mutation(api.challenges.accept, { code, language: "python" });
    expect((await users.ada.as.query(api.challenges.mine)).outgoing).toEqual([]);
  });

  it("declines and cancels", async () => {
    const { users } = await seeded();
    const first = await users.ada.as.mutation(api.challenges.create, { username: "bob", ranked: false, language: "python" });
    await users.bob.as.mutation(api.challenges.decline, { id: first.challengeId });
    expect(await users.ada.as.query(api.challenges.get, { code: first.code })).toMatchObject({ status: "declined" });

    const second = await users.ada.as.mutation(api.challenges.create, { username: "bob", ranked: false, language: "python" });
    await users.ada.as.mutation(api.challenges.cancel, { id: second.challengeId });
    await expect(users.bob.as.mutation(api.challenges.accept, { code: second.code, language: "python" })).rejects.toThrow(
      "CHALLENGE_CLOSED",
    );
  });
});
