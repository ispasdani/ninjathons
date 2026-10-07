// @vitest-environment node
// Find a match: joining, the pairing pass, stale rows and leaving.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { STALE_AFTER_MS } from "./queue";
import { identity, setup } from "./test.setup";

const problem = {
  slug: "add",
  title: "Add",
  statement: "Return a + b.",
  difficulty: "medium" as const,
  tags: [],
  judge: {
    mode: "function" as const,
    signature: {
      functionName: "add",
      params: [
        { name: "a", type: "int" as const },
        { name: "b", type: "int" as const },
      ],
      returns: "int" as const,
    },
  },
  checker: { kind: "exact" as const },
  examples: [{ input: '{"a":1,"b":2}', output: "3" }],
  limits: { timeMs: 2000, memoryMb: 256 },
  languages: "all" as const,
  pool: "practice" as const,
  version: 1,
  hints: [],
  status: "beta" as const,
};

async function seeded(names = ["ada", "bob"]) {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  await t.mutation(internal.problems.seed, { problem, tests: { file, count: 0 } });
  const users: Record<string, { id: Id<"users">; as: ReturnType<typeof t.withIdentity> }> = {};
  for (const name of names) {
    const id = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
    const as = t.withIdentity(identity(`user_${name}`));
    await as.mutation(api.user.setUsername, { username: name });
    users[name] = { id, as };
  }
  // Runs the passes due now (the one a join schedules).
  async function passes(ms = 0) {
    vi.advanceTimersByTime(ms);
    await t.finishInProgressScheduledFunctions();
  }
  return { t, users, passes };
}

async function setRating(t: ReturnType<typeof setup>, userId: Id<"users">, rating: number) {
  await t.run((ctx) =>
    ctx.db.insert("ratings", {
      userId,
      area: "1v1",
      rating,
      rd: 100,
      volatility: 0.06,
      games: 20,
      wins: 10,
      losses: 10,
      draws: 0,
      lastGameAt: Date.now(),
    }),
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("queue", () => {
  it("pairs two waiting players into a ranked match in their own languages", async () => {
    const { t, users, passes } = await seeded();
    await users.ada.as.mutation(api.queue.join, { language: "python" });
    await passes();
    expect((await users.ada.as.query(api.queue.status)).queued).toMatchObject({ language: "python" });
    expect((await users.bob.as.query(api.queue.status)).waiting).toBe(1);

    await users.bob.as.mutation(api.queue.join, { language: "rust" });
    await passes();
    const current = await users.ada.as.query(api.matches.current);
    expect(current?.status).toBe("countdown");
    expect(await users.bob.as.query(api.matches.current)).toEqual(current);
    expect((await users.ada.as.query(api.queue.status)).queued).toBeNull();

    const match = await users.ada.as.query(api.matches.get, { id: current!._id });
    expect(match?.ranked).toBe(true);
    expect(match?.source).toBe("queue");
    expect(match?.players.map((p) => p.language).sort()).toEqual(["python", "rust"]);
    expect(await t.run((ctx) => ctx.db.query("matchQueue").collect())).toEqual([]);
  });

  it("waits for the range to widen before pairing distant ratings", async () => {
    const { t, users, passes } = await seeded();
    await setRating(t, users.ada.id, 1200);
    await setRating(t, users.bob.id, 1500);
    await users.ada.as.mutation(api.queue.join, { language: "python" });
    await users.bob.as.mutation(api.queue.join, { language: "python" });
    await passes();
    expect(await users.ada.as.query(api.matches.current)).toBeNull();

    // Ada's range reaches ±300 after 20 s; the pass runs every 2 s. Keep both alive.
    for (let waited = 0; waited < 20_000; waited += 2_000) {
      await users.ada.as.mutation(api.queue.heartbeat);
      await users.bob.as.mutation(api.queue.heartbeat);
      await passes(2_000);
    }
    expect(await users.ada.as.query(api.matches.current)).not.toBeNull();
  });

  it("drops players whose page stopped sending heartbeats", async () => {
    const { t, users, passes } = await seeded();
    await users.ada.as.mutation(api.queue.join, { language: "python" });
    await passes();
    for (let waited = 0; waited <= STALE_AFTER_MS; waited += 2_000) await passes(2_000);
    expect((await users.ada.as.query(api.queue.status)).queued).toBeNull();
    // With nobody waiting, the pass stops rescheduling itself.
    expect(await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()).then((s) =>
      s.filter((f) => f.state.kind === "pending").length,
    )).toBe(0);
  });

  it("refuses to queue a player already in a match, and lets players leave", async () => {
    const { users, passes } = await seeded();
    await users.ada.as.mutation(api.queue.join, { language: "python" });
    await users.ada.as.mutation(api.queue.leave);
    expect((await users.ada.as.query(api.queue.status)).queued).toBeNull();

    await users.ada.as.mutation(api.queue.join, { language: "python" });
    await users.bob.as.mutation(api.queue.join, { language: "python" });
    await passes();
    await expect(users.ada.as.mutation(api.queue.join, { language: "python" })).rejects.toThrow("ALREADY_IN_MATCH");
  });
});
