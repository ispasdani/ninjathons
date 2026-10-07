// @vitest-environment node
// The 1v1 match engine: countdown, the hidden problem, Submits, results,
// ratings and XP. Verdicts are mostly written directly; one test judges real
// code through the local runner.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { localRunner } from "../scripts/lib/local-runner";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { COUNTDOWN_MS, createMatch, MATCH_TIME_MS, MATCH_XP, PAIR_GAMES_PER_DAY, SUBMIT_COOLDOWN_MS } from "./lib/matches";
import type { Verdict } from "./schemas/submissions";
import { identity, setup } from "./test.setup";

vi.mock("./judge/vercelRunner", () => ({
  RunnerNotConfiguredError: class extends Error {},
  vercelRunner: () => localRunner,
}));

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

const hidden = [
  { input: '{"a":-5,"b":5}', expectedOutput: "0" },
  { input: '{"a":2147483000,"b":600}', expectedOutput: "2147483600" },
];

const CORRECT = "def add(a, b):\n    return a + b\n";

function verdict(passed: number, total = 3): Verdict {
  return {
    status: passed === total ? "accepted" : "wrong_answer",
    passed,
    total,
    timeMs: 5,
    tests: [],
  };
}

async function seeded() {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob([JSON.stringify(hidden)])));
  await t.mutation(internal.problems.seed, { problem, tests: { file, count: hidden.length } });
  const [ada, bob] = await Promise.all(
    ["ada", "bob"].map((name) =>
      t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser),
    ),
  );
  const asAda = t.withIdentity(identity("user_ada"));
  const asBob = t.withIdentity(identity("user_bob"));
  await asAda.mutation(api.user.setUsername, { username: "ada" });
  await asBob.mutation(api.user.setUsername, { username: "bob" });

  async function match(ranked = true) {
    const id = await t.run((ctx) =>
      createMatch(ctx, {
        players: [
          { userId: ada, language: "python" },
          { userId: bob, language: "python" },
        ],
        ranked,
        source: "queue",
      }),
    );
    return id!;
  }

  // Lets the scheduled start (or time up) run.
  async function advance(ms: number) {
    vi.advanceTimersByTime(ms);
    await t.finishInProgressScheduledFunctions();
  }

  // Sends a Submit without judging it; `judge` writes its verdict later.
  // Marked running, so the scheduled judging action leaves it alone.
  async function submit(as: typeof asAda, matchId: Id<"matches">, source = CORRECT) {
    const submissionId = await as.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source,
      kind: "submit",
      matchId,
    });
    await t.mutation(internal.submissions.markRunning, { submissionId });
    return submissionId;
  }
  async function judge(submissionId: Id<"submissions">, v: Verdict) {
    await t.mutation(internal.submissions.finish, { submissionId, verdict: v });
  }

  return { t, ada, bob, asAda, asBob, match, advance, submit, judge };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("matches", () => {
  it("hides the problem until the countdown ends, and from other users", async () => {
    const { t, asAda, match, advance } = await seeded();
    const id = await match();

    const before = await asAda.query(api.matches.get, { id });
    expect(before?.status).toBe("countdown");
    expect(before?.difficulty).toBe("medium");
    expect(before?.problem).toBeNull();
    expect(await asAda.query(api.matches.current)).toMatchObject({ _id: id, status: "countdown" });

    await t.withIdentity(identity("user_eve", { name: "eve" })).mutation(api.user.ensureUser);
    expect(await t.withIdentity(identity("user_eve")).query(api.matches.get, { id })).toBeNull();

    await advance(COUNTDOWN_MS);
    const after = await asAda.query(api.matches.get, { id });
    expect(after?.status).toBe("active");
    expect(after?.problem?.slug).toBe("add");
  });

  it("refuses Submits before the start and within the cooldown", async () => {
    const { asAda, match, advance, submit, judge } = await seeded();
    const id = await match();
    await expect(submit(asAda, id)).rejects.toThrow("MATCH_OVER");

    await advance(COUNTDOWN_MS);
    const first = await submit(asAda, id, "def add(a, b):\n    return 0\n");
    await judge(first, verdict(0));
    await expect(submit(asAda, id)).rejects.toThrow("SUBMIT_COOLDOWN");

    vi.advanceTimersByTime(SUBMIT_COOLDOWN_MS);
    await submit(asAda, id);
    const view = await asAda.query(api.matches.get, { id });
    expect(view?.players.find((p) => p.you)?.submits).toBe(2);
  });

  it("ends on the first full pass, rating both players and giving match XP", async () => {
    // Real code through the local runner, which needs real timers.
    vi.useRealTimers();
    const { t, ada, bob, asAda, asBob, match } = await seeded();
    const id = await match();
    await t.mutation(internal.matches.start, { matchId: id });

    async function judged() {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await t.finishInProgressScheduledFunctions();
    }
    await asBob.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source: "def add(a, b):\n    return a + b if a > 0 else 1\n",
      kind: "submit",
      matchId: id,
    });
    await judged();
    await asAda.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source: CORRECT,
      kind: "submit",
      matchId: id,
    });
    await judged();

    const view = await asAda.query(api.matches.get, { id });
    expect(view).toMatchObject({ status: "finished", reason: "solved", winnerId: ada });
    const me = view!.players.find((p) => p.you)!;
    const them = view!.players.find((p) => !p.you)!;
    expect(me).toMatchObject({ result: "win", counted: true, xpAwarded: MATCH_XP.won, bestPassed: 3, solved: true });
    expect(me.ratingChange).toBeGreaterThan(0);
    expect(me.badgesEarned).toContain("first-ranked-win");
    // Bob had passed one test before Ada had passed any.
    expect(me.badgesEarned).toContain("comeback-win");
    expect(them).toMatchObject({ result: "loss", bestPassed: 1, solved: false });
    expect(them.ratingChange).toBeLessThan(0);
    expect(view!.events.length).toBe(2);

    const users = await t.run(async (ctx) => [await ctx.db.get(ada), await ctx.db.get(bob)]);
    // Ada also gets the solve XP for a first solve.
    expect(users[0]?.xp).toBe(MATCH_XP.won + 20);
    expect(users[1]?.xp).toBe(MATCH_XP.played);
    expect(await asAda.query(api.matches.current)).toBeNull();
  });

  it("waits for an earlier Submit still being judged before naming a winner", async () => {
    const { bob, asAda, asBob, match, advance, submit, judge } = await seeded();
    const id = await match();
    await advance(COUNTDOWN_MS);

    const bobs = await submit(asBob, id);
    vi.advanceTimersByTime(1000);
    const adas = await submit(asAda, id);
    // Ada's verdict comes back first, but Bob sent his earlier.
    await judge(adas, verdict(3));
    expect((await asAda.query(api.matches.get, { id }))?.status).toBe("active");
    await judge(bobs, verdict(3));
    expect(await asAda.query(api.matches.get, { id })).toMatchObject({ status: "finished", winnerId: bob });
  });

  it("at time up, the best Submit wins; no passes is a draw", async () => {
    const { ada, asAda, asBob, match, advance, submit, judge } = await seeded();
    const id = await match();
    await advance(COUNTDOWN_MS);
    await judge(await submit(asBob, id), verdict(1));
    await judge(await submit(asAda, id), verdict(2));
    await advance(MATCH_TIME_MS.medium);
    expect(await asAda.query(api.matches.get, { id })).toMatchObject({
      status: "finished",
      reason: "time",
      winnerId: ada,
    });

    const draw = await match();
    await advance(COUNTDOWN_MS + MATCH_TIME_MS.medium);
    const view = await asAda.query(api.matches.get, { id: draw });
    expect(view).toMatchObject({ status: "finished", reason: "time" });
    expect(view?.winnerId).toBeUndefined();
    expect(view?.players.every((p) => p.result === "draw")).toBe(true);
  });

  it("refuses a Submit after time up but counts one sent in time and judged later", async () => {
    const { ada, asAda, match, advance, submit, judge } = await seeded();
    const id = await match();
    await advance(COUNTDOWN_MS + MATCH_TIME_MS.medium - 1000);
    const late = await submit(asAda, id);
    await advance(1000);
    expect((await asAda.query(api.matches.get, { id }))?.status).toBe("active");
    await expect(submit(asAda, id)).rejects.toThrow("MATCH_OVER");
    await judge(late, verdict(3));
    expect(await asAda.query(api.matches.get, { id })).toMatchObject({ status: "finished", winnerId: ada });
  });

  it("cancels on a forfeit during the countdown; afterwards the opponent wins", async () => {
    const { bob, asAda, match, advance } = await seeded();
    const first = await match();
    await asAda.mutation(api.matches.forfeit, { id: first });
    expect((await asAda.query(api.matches.get, { id: first }))?.status).toBe("cancelled");

    const second = await match();
    await advance(COUNTDOWN_MS);
    await asAda.mutation(api.matches.forfeit, { id: second });
    expect(await asAda.query(api.matches.get, { id: second })).toMatchObject({
      status: "finished",
      reason: "forfeit",
      winnerId: bob,
    });
  });

  it("stops counting ranked games between the same pair after the daily limit", async () => {
    const { asAda, match, advance } = await seeded();
    for (let i = 0; i <= PAIR_GAMES_PER_DAY; i++) {
      const id = await match();
      await advance(COUNTDOWN_MS);
      await asAda.mutation(api.matches.forfeit, { id });
      const me = (await asAda.query(api.matches.get, { id }))!.players.find((p) => p.you)!;
      expect(me.counted).toBe(i < PAIR_GAMES_PER_DAY);
      expect(me.xpAwarded).toBe(i < PAIR_GAMES_PER_DAY ? MATCH_XP.played : undefined);
    }
  });

  it("an unranked match changes no rating and gives no match XP", async () => {
    const { ada, t, asAda, match, advance } = await seeded();
    const id = await match(false);
    await advance(COUNTDOWN_MS);
    await asAda.mutation(api.matches.forfeit, { id });
    const me = (await asAda.query(api.matches.get, { id }))!.players.find((p) => p.you)!;
    expect(me).toMatchObject({ result: "loss", counted: false });
    expect(me.ratingChange).toBeUndefined();
    expect(await t.run((ctx) => ctx.db.get(ada).then((u) => u?.xp ?? 0))).toBe(0);
  });
});
