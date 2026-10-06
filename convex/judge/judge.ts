/**
 * Turns a submission into a verdict: build the program for the language, hand
 * it to a runner, then compare each output with the expected one here, where
 * the expected outputs live. Used by Convex (Vercel Sandbox runner) and by the
 * problems:check script (local runner), so both judge exactly the same way.
 */
import type { TestResult, Verdict, VerdictStatus } from "../schemas/submissions";
import { outputMatches } from "./checker";
import { LANGUAGES } from "./languages";
import type { Checker, CodeRunner, Judge, Language, Limits, RunOutput, TestRun } from "./types";
import { decodeResult, encodeArgs } from "./wire";

export type JudgeTest = {
  input: string;
  expected: string;
  /** Whether the user may see this test's input and outputs (the examples). */
  visible: boolean;
};

export type JudgeRequest = {
  judge: Judge;
  checker: Checker;
  limits: Limits;
  language: Language;
  source: string;
  tests: JudgeTest[];
  /** Submit stops at the first failing test; Run judges every example. */
  stopAtFirstFailure: boolean;
};

const MAX_SHOWN = 2000;

function clip(text: string): string {
  return text.length > MAX_SHOWN ? text.slice(0, MAX_SHOWN) + "\n... (truncated)" : text;
}

/** `runCode({ language, source, tests, limits })` from decisions §5. */
export async function runCode(
  runner: CodeRunner,
  request: Pick<JudgeRequest, "judge" | "language" | "source" | "limits" | "stopAtFirstFailure"> & {
    tests: string[];
  },
): Promise<RunOutput> {
  const spec = LANGUAGES[request.language];
  const { judge } = request;
  const tokens = judge.mode === "function" && spec.wire === "tokens";
  const output = await runner.run({
    ...spec.program(judge, request.source, request.limits.memoryMb),
    tests: tokens ? request.tests.map((input) => encodeArgs(judge.signature, input)) : request.tests,
    timeLimitMs: Math.round(request.limits.timeMs * spec.timeMultiplier),
    // A crash or timeout usually repeats on every test, so stop at the first
    // one even on Run. Wrong answers are found here, after the run.
    stopOnError: true,
    image: spec.image,
  });
  // The runtime ran out of memory under the limit. Also when that took until
  // the time limit: near its heap limit Node.js collects garbage for seconds.
  for (const test of output.tests) {
    if ((test.status === "runtime_error" || test.status === "time_limit") && spec.outOfMemory.test(test.stderr)) {
      test.status = "memory_limit";
    }
  }
  if (!tokens) return output;
  // Back to JSON, so checkers and the solve view only ever see JSON.
  return {
    ...output,
    tests: output.tests.map((test) => {
      if (test.status !== "ok") return test;
      try {
        return { ...test, stdout: decodeResult(judge.signature.returns, test.stdout) + "\n" };
      } catch (error) {
        // Shown as a wrong answer, with the reason in the logs.
        const reason = `The driver couldn't read the return value: ${(error as Error).message}`;
        return { ...test, stdout: "", stderr: test.stderr ? `${test.stderr}\n${reason}` : reason };
      }
    }),
  };
}

export async function judgeSubmission(runner: CodeRunner, request: JudgeRequest): Promise<Verdict> {
  const output = await runCode(runner, { ...request, tests: request.tests.map((t) => t.input) });
  return decideVerdict(request, output);
}

export function decideVerdict(
  request: Pick<JudgeRequest, "judge" | "checker" | "tests" | "stopAtFirstFailure" | "language" | "source">,
  output: RunOutput,
): Verdict {
  const total = request.tests.length;
  if (output.compile && !output.compile.ok) {
    return { status: "compile_error", passed: 0, total, timeMs: 0, compileOutput: output.compile.output, tests: [] };
  }

  const tests: TestResult[] = [];
  let status: VerdictStatus = "accepted";
  let passed = 0;
  const sourceLines = request.source.split("\n").length;
  for (let i = 0; i < output.tests.length && i < total; i++) {
    const test = request.tests[i];
    const run = output.tests[i];
    const result = judgeOne(request, test, run, sourceLines);
    tests.push(result);
    if (result.status === "accepted") {
      passed++;
    } else {
      if (status === "accepted") status = result.status;
      if (request.stopAtFirstFailure) break;
    }
  }
  // The runner stopped early or returned fewer results than tests.
  if (status === "accepted" && passed < total) status = "runtime_error";

  const timeMs = tests.reduce((max, t) => Math.max(max, t.timeMs), 0);
  return { status, passed, total, timeMs, tests };
}

function judgeOne(
  request: Pick<JudgeRequest, "judge" | "checker" | "language">,
  test: JudgeTest,
  run: TestRun,
  sourceLines: number,
): TestResult {
  const status: VerdictStatus =
    run.status !== "ok"
      ? run.status
      : outputMatches(request.judge, request.checker, test.expected, run.stdout)
        ? "accepted"
        : "wrong_answer";
  const result: TestResult = { status, timeMs: run.timeMs, visible: test.visible };
  if (test.visible) {
    result.input = test.input;
    result.expected = test.expected;
    result.actual = clip(run.stdout.trimEnd());
    const logs = LANGUAGES[request.language].cleanError(run.stderr, sourceLines);
    if (logs) result.logs = clip(logs);
  }
  // Hidden tests return no output at all, not even an error message: a
  // solution could print the hidden input to stderr and then crash on purpose.
  return result;
}
