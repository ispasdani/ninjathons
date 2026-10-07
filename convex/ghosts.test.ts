// @vitest-environment node
// Ghost races: replaying a recorded solve from a finished match.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { COUNTDOWN_MS, createMatch } from "./lib/matches";
import type { Verdict } from "./schemas/submissions";
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

function verdict(passed: number, total = 3): Verdict {
  return { status: passed === total ? "accepted" : "wrong_answer", passed, total, timeMs: 5, tests: [] };
}

async function seeded() {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob(["[]"])));
  await t.mutation(internal.problems.seed, { problem, tests: { file, count: 2 } });
  const users: Record<string, { id: Id<"users">; as: ReturnType<typeof t.withIdentity> }> = {};
  for (const name of ["ada", "bob", "cyd"]) {
    const id = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
    const as = t.withIdentity(identity(`user_${name}`));
    await as.mutation(api.user.setUsername, { username: name });
    users[name] = { id, as };
  }

  async function advance(ms: number) {
    vi.advanceTimersByTime(ms);
    await t.finishInProgressScheduledFunctions();
  }

  async function submit(as: (typeof users)[string]["as"], matchId: Id<"matches">, v: Verdict) {
    const submissionId = await as.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source: "print(3)",
      kind: "submit",
      matchId,
    });
    await t.mutation(internal.submissions.markRunning, { submissionId });
    await t.mutation(internal.submissions.finish, { submissionId, verdict: v });
  }

  /** Ada beats Bob: one Submit passing 1 test after 30 s, then a full pass after 60 s. */
  async function recordAdaWin() {
    const matchId = (await t.run((ctx) =>
      createMatch(ctx, {
        players: [
          { userId: users.ada.id, language: "python" },
          { userId: users.bob.id, language: "python" },
        ],
        ranked: false,
        source: "challenge",
      }),
    ))!;
    await advance(COUNTDOWN_MS + 30_000);
    await submit(users.ada.as, matchId, verdict(1));
    await advance(30_000);
    await submit(users.ada.as, matchId, verdict(3));
    return matchId;
  }

  return { t, users, advance, submit, recordAdaWin };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ghost races", () => {
  it("has no ghost until someone has solved in a match", async () => {
    const { users } = await seeded();
    expect(await users.cyd.as.query(api.ghosts.available)).toBe(false);
    await expect(users.cyd.as.mutation(api.ghosts.start, { language: "python" })).rejects.toThrow("NO_GHOSTS");
  });

  it("replays the recording on the server, and the ghost wins if it's faster", async () => {
    const { t, users, advance, recordAdaWin } = await seeded();
    await recordAdaWin();
    expect(await users.cyd.as.query(api.ghosts.available)).toBe(true);
    // A player's own recording is never their ghost, and Bob never solved.
    expect(await users.ada.as.query(api.ghosts.available)).toBe(false);

    const id = await users.cyd.as.mutation(api.ghosts.start, { language: "rust" });
    const before = await users.cyd.as.query(api.matches.get, { id });
    expect(before).toMatchObject({ source: "ghost", ranked: false, status: "countdown" });
    const ghost = before!.players.find((p) => !p.you)!;
    expect(ghost).toMatchObject({ ghost: true, username: "ada" });
    // Ada isn't in this match: she can still queue.
    expect(await users.ada.as.query(api.matches.current)).toBeNull();

    await advance(COUNTDOWN_MS + 30_000);
    const midway = await users.cyd.as.query(api.matches.get, { id });
    expect(midway?.players.find((p) => p.ghost)).toMatchObject({ bestPassed: 1, submits: 1 });

    await advance(30_000);
    const after = await users.cyd.as.query(api.matches.get, { id });
    expect(after).toMatchObject({ status: "finished", reason: "solved", winnerId: users.ada.id });
    expect(after!.players.find((p) => p.you)).toMatchObject({ result: "loss", counted: false });
    expect(await t.run((ctx) => ctx.db.query("ratings").collect())).toEqual([]);
  });

  it("the player wins by solving before the ghost", async () => {
    const { users, advance, submit, recordAdaWin } = await seeded();
    await recordAdaWin();
    const id = await users.cyd.as.mutation(api.ghosts.start, { language: "python" });
    await advance(COUNTDOWN_MS + 10_000);
    await submit(users.cyd.as, id, verdict(3));
    const after = await users.cyd.as.query(api.matches.get, { id });
    expect(after).toMatchObject({ status: "finished", winnerId: users.cyd.id });
    // The ghost's later steps find the match over and do nothing.
    await advance(60_000);
    expect((await users.cyd.as.query(api.matches.get, { id }))?.events.length).toBe(1);
  });
});
