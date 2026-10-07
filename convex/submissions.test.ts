// @vitest-environment node
// The whole judging flow in Convex: submit, the scheduled judging action, the
// verdict on the row. Vercel Sandbox is swapped for the local runner, so this
// runs real code without credentials.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { localRunner } from "../scripts/lib/local-runner";
import { api, internal } from "./_generated/api";
import { identity, setup } from "./test.setup";

vi.mock("./judge/vercelRunner", () => ({
  RunnerNotConfiguredError: class extends Error {},
  vercelRunner: () => localRunner,
}));

const signature = {
  functionName: "add",
  params: [
    { name: "a", type: "int" as const },
    { name: "b", type: "int" as const },
  ],
  returns: "int" as const,
};

const problem = {
  slug: "add",
  title: "Add",
  statement: "Return a + b.",
  difficulty: "easy" as const,
  tags: [],
  judge: { mode: "function" as const, signature },
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

async function seeded() {
  const t = setup();
  const file = await t.run((ctx) => ctx.storage.store(new Blob([JSON.stringify(hidden)])));
  await t.mutation(internal.problems.seed, { problem, tests: { file, count: hidden.length } });
  const users = await Promise.all(
    ["ada", "bob"].map((name) =>
      t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser),
    ),
  );
  return { t, users, asAda: t.withIdentity(identity("user_ada")), asBob: t.withIdentity(identity("user_bob")) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function judged(t: ReturnType<typeof setup>) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

describe("submissions", () => {
  it("judges Submit on examples and hidden tests", async () => {
    const { t, asAda } = await seeded();
    const id = await asAda.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source: "def add(a, b):\n    return a + b\n",
      kind: "submit",
    });
    await judged(t);
    const row = await asAda.query(api.submissions.get, { id });
    expect(row?.status).toBe("done");
    expect(row?.verdict).toMatchObject({ status: "accepted", passed: 3, total: 3 });
  });

  it("judges Run on the examples only", async () => {
    const { t, asAda } = await seeded();
    const id = await asAda.mutation(api.submissions.create, {
      slug: "add",
      language: "javascript",
      source: "function add(a, b) { return a - b; }",
      kind: "run",
    });
    await judged(t);
    const row = await asAda.query(api.submissions.get, { id });
    expect(row?.verdict).toMatchObject({ status: "wrong_answer", total: 1 });
    expect(row?.verdict?.tests[0]).toMatchObject({ visible: true, expected: "3", actual: "-1" });
  });

  it("never shows hidden test data", async () => {
    const { t, asAda } = await seeded();
    const id = await asAda.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source: "def add(a, b):\n    print(a, b)\n    return 3\n",
      kind: "submit",
    });
    await judged(t);
    const row = await asAda.query(api.submissions.get, { id });
    expect(row?.verdict?.status).toBe("wrong_answer");
    expect(row?.verdict?.tests[1]).toEqual({ status: "wrong_answer", timeMs: expect.any(Number), visible: false });
    expect(JSON.stringify(row)).not.toContain("-5");
    const page = await t.query(api.problems.getBySlug, { slug: "add" });
    expect(JSON.stringify(page)).not.toContain("2147483600");
  });

  it("lets users read only their own submissions", async () => {
    const { asAda, asBob } = await seeded();
    const id = await asAda.mutation(api.submissions.create, {
      slug: "add",
      language: "python",
      source: "",
      kind: "run",
    });
    expect(await asBob.query(api.submissions.get, { id })).toBeNull();
  });

  it("allows one submission at a time per user", async () => {
    const { t, asAda } = await seeded();
    const args = { slug: "add", language: "python" as const, source: "", kind: "run" as const };
    await asAda.mutation(api.submissions.create, args);
    await expect(asAda.mutation(api.submissions.create, args)).rejects.toThrowError("SUBMISSION_IN_PROGRESS");
    await judged(t);
    await asAda.mutation(api.submissions.create, args);
  });

  it("refuses signed-out callers, drafts and oversized code", async () => {
    const { t, asAda } = await seeded();
    const args = { slug: "add", language: "python" as const, source: "", kind: "run" as const };
    await expect(t.mutation(api.submissions.create, args)).rejects.toThrowError("UNAUTHENTICATED");
    await expect(
      asAda.mutation(api.submissions.create, { ...args, source: "x".repeat(70 * 1024) }),
    ).rejects.toThrowError("SOURCE_TOO_LONG");
    await t.run(async (ctx) => {
      const row = await ctx.db.query("problems").first();
      await ctx.db.patch(row!._id, { status: "draft" });
    });
    await expect(asAda.mutation(api.submissions.create, args)).rejects.toThrowError("PROBLEM_NOT_FOUND");
    expect(await t.query(api.problems.getBySlug, { slug: "add" })).toBeNull();
  });
});

describe("solve XP", () => {
  const correct = {
    python: "def add(a, b):\n    return a + b\n",
    javascript: "function add(a, b) { return a + b; }",
  };

  async function submit(
    t: ReturnType<typeof setup>,
    as: ReturnType<ReturnType<typeof setup>["withIdentity"]>,
    args: { language: "python" | "javascript"; source: string; kind?: "run" | "submit" },
  ) {
    const id = await as.mutation(api.submissions.create, { slug: "add", kind: "submit", ...args });
    await judged(t);
    return await as.query(api.submissions.get, { id });
  }

  const ledger = (t: ReturnType<typeof setup>) => t.run((ctx) => ctx.db.query("xpLedger").collect());

  it("awards XP by difficulty on the first accepted Submit", async () => {
    const { t, users, asAda } = await seeded();
    const row = await submit(t, asAda, { language: "python", source: correct.python });
    expect(row?.xpAwarded).toBe(10);
    expect(row?.badgesEarned).toEqual(["first-solve"]);
    const again = await submit(t, asAda, { language: "python", source: correct.python });
    expect(again?.badgesEarned).toBeUndefined();
    expect(await ledger(t)).toEqual([
      expect.objectContaining({ userId: users[0], key: "solve:add:python", source: "solve", amount: 10 }),
    ]);
  });

  it("gives nothing for Run or a failed Submit", async () => {
    const { t, asAda } = await seeded();
    const run = await submit(t, asAda, { language: "python", source: correct.python, kind: "run" });
    const wrong = await submit(t, asAda, { language: "python", source: "def add(a, b):\n    return 3\n" });
    expect(run?.verdict?.status).toBe("accepted");
    expect(wrong?.verdict?.status).toBe("wrong_answer");
    expect(run?.xpAwarded).toBeUndefined();
    expect(wrong?.xpAwarded).toBeUndefined();
    expect(await ledger(t)).toHaveLength(0);
  });

  it("counts each problem once per language and once per user", async () => {
    const { t, asAda, asBob } = await seeded();
    await submit(t, asAda, { language: "python", source: correct.python });
    const again = await submit(t, asAda, { language: "python", source: correct.python });
    const js = await submit(t, asAda, { language: "javascript", source: correct.javascript });
    const bob = await submit(t, asBob, { language: "python", source: correct.python });
    expect(again?.xpAwarded).toBeUndefined();
    expect(js?.xpAwarded).toBe(10);
    expect(bob?.xpAwarded).toBe(10);
    expect(await ledger(t)).toHaveLength(3);
  });

  it("uses the problem's difficulty", async () => {
    const { t, asAda } = await seeded();
    await t.run(async (ctx) => {
      const row = await ctx.db.query("problems").first();
      await ctx.db.patch(row!._id, { difficulty: "hard" });
    });
    const row = await submit(t, asAda, { language: "python", source: correct.python });
    expect(row?.xpAwarded).toBe(40);
    expect(row?.levelReached).toBeUndefined();
  });

  it("records the level a solve reaches", async () => {
    const { t, users, asAda } = await seeded();
    await t.run((ctx) => ctx.db.patch(users[0], { xp: 95 }));
    const row = await submit(t, asAda, { language: "python", source: correct.python });
    expect(row?.levelReached).toBe(2);
  });

  // The phase 3 check: solves award XP and badges, and leaderboards update.
  it("puts a solve on the Level boards", async () => {
    const { t, asAda } = await seeded();
    await t.withIdentity(identity("user_ada")).mutation(api.user.setUsername, { username: "ada" });
    await submit(t, asAda, { language: "python", source: correct.python });
    await t.mutation(internal.leaderboards.rebuildAll, {});
    await judged(t);

    for (const board of ["level", "level-month"] as const) {
      const { rows, me } = await asAda.query(api.leaderboards.board, { board, scope: "global" });
      expect(rows).toEqual([expect.objectContaining({ rank: 1, username: "ada", value: 10 })]);
      expect(me).toEqual({ rank: 1, value: 10 });
    }
  });
});
