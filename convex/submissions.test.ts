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
