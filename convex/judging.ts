"use node";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { judgeSubmission, type JudgeTest } from "./judge/judge";
import type { CodeRunner } from "./judge/types";
import { RunnerNotConfiguredError, vercelRunner } from "./judge/vercelRunner";

/**
 * Judges one submission (scheduled by submissions.create). Expected outputs
 * are compared here, in Convex; the sandbox only ever sees inputs.
 */
export const judge = internalAction({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const started = Date.now();
    const job = await ctx.runQuery(internal.submissions.loadForJudging, { submissionId });
    if (!job) return;
    const { submission, problem, testsFile } = job;
    console.log(`judging: picked up ${started - submission._creationTime} ms after submit`);
    await ctx.runMutation(internal.submissions.markRunning, { submissionId });

    let runner: CodeRunner | undefined;
    try {
      runner = vercelRunner();
      const tests: JudgeTest[] = problem.examples.map((e) => ({
        input: e.input,
        expected: e.output,
        visible: true,
      }));
      if (submission.kind === "submit") {
        if (!testsFile) throw new Error(`no hidden tests for ${problem.slug} v${submission.problemVersion}`);
        const blob = await ctx.storage.get(testsFile);
        if (!blob) throw new Error(`hidden tests file missing for ${problem.slug}`);
        const hidden = JSON.parse(await blob.text()) as { input: string; expectedOutput: string }[];
        tests.push(...hidden.map((t) => ({ input: t.input, expected: t.expectedOutput, visible: false })));
      }

      const verdict = await judgeSubmission(runner, {
        judge: problem.judge,
        checker: problem.checker,
        limits: problem.limits,
        language: submission.language,
        source: submission.source,
        tests,
        stopAtFirstFailure: submission.kind === "submit",
      });
      await ctx.runMutation(internal.submissions.finish, { submissionId, verdict });
    } catch (error) {
      console.error(`judging ${submissionId} failed`, error);
      const message =
        error instanceof RunnerNotConfiguredError
          ? error.message
          : "The code runner failed. This is on our side, not your code; please try again.";
      await ctx.runMutation(internal.submissions.finish, { submissionId, error: message });
    } finally {
      // After the verdict is saved: the user doesn't wait for the sandbox to stop.
      await runner?.close?.();
    }
  },
});
