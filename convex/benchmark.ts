"use node";
/**
 * Times real verdicts in Vercel Sandbox without a signed-in user: judges a
 * given source against a seeded problem, exactly as judging.judge does, and
 * returns the verdict with the wall-clock time. Internal, so only the CLI
 * (npm run sandbox:bench) can call it.
 */
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { judgeSubmission, type JudgeTest } from "./judge/judge";
import { vercelRunner } from "./judge/vercelRunner";
import { hiddenTestsDrive } from "./testDrives";
import { language } from "./schemas/problems";

export const judgeSource = internalAction({
  args: {
    slug: v.string(),
    language,
    source: v.string(),
    kind: v.union(v.literal("run"), v.literal("submit")),
  },
  // Typed, since its result would otherwise feed into its own type through `internal`.
  handler: async (
    ctx,
    { slug, language, source, kind },
  ): Promise<{
    ms: number;
    status: string;
    passed: number;
    total: number;
    drive: boolean;
    compileOutput?: string;
    logs?: string;
  }> => {
    const loaded = await ctx.runQuery(internal.problems.loadWithTests, { slug });
    if (!loaded) throw new Error(`no problem ${slug}`);
    const { problem, testsFile } = loaded;
    const tests: JudgeTest[] = problem.examples.map((e) => ({ input: e.input, expected: e.output, visible: true }));
    let drive: { name: string; count: number } | undefined;
    if (kind === "submit") {
      const blob = testsFile && (await ctx.storage.get(testsFile));
      if (!blob) throw new Error(`no hidden tests for ${slug}`);
      const hidden = JSON.parse(await blob.text()) as { input: string; expectedOutput: string }[];
      tests.push(...hidden.map((t) => ({ input: t.input, expected: t.expectedOutput, visible: false })));
      drive = await hiddenTestsDrive(ctx, { file: testsFile, problemId: problem._id, language, count: hidden.length });
    }
    const runner = vercelRunner();
    const started = Date.now();
    try {
      const verdict = await judgeSubmission(runner, {
        judge: problem.judge,
        checker: problem.checker,
        limits: problem.limits,
        language,
        source,
        tests,
        stopAtFirstFailure: kind === "submit",
        drive,
      });
      return {
        ms: Date.now() - started,
        status: verdict.status,
        passed: verdict.passed,
        total: verdict.total,
        drive: drive !== undefined,
        compileOutput: verdict.compileOutput,
        logs: verdict.tests.find((t) => t.logs)?.logs,
      };
    } finally {
      await runner.close?.();
    }
  },
});
