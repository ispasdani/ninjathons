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
  return await runner.run({
    ...spec.program(request.judge, request.source),
    tests: request.tests,
    timeLimitMs: Math.round(request.limits.timeMs * spec.timeMultiplier),
    stopOnError: request.stopAtFirstFailure,
  });
}

export async function judgeSubmission(runner: CodeRunner, request: JudgeRequest): Promise<Verdict> {
  const output = await runCode(runner, { ...request, tests: request.tests.map((t) => t.input) });
  return decideVerdict(request, output);
}

export function decideVerdict(
  request: Pick<JudgeRequest, "judge" | "checker" | "tests" | "stopAtFirstFailure">,
  output: RunOutput,
): Verdict {
  const total = request.tests.length;
  if (output.compile && !output.compile.ok) {
    return { status: "compile_error", passed: 0, total, timeMs: 0, compileOutput: output.compile.output, tests: [] };
  }

  const tests: TestResult[] = [];
  let status: VerdictStatus = "accepted";
  let passed = 0;
  for (let i = 0; i < output.tests.length && i < total; i++) {
    const test = request.tests[i];
    const run = output.tests[i];
    const result = judgeOne(request, test, run);
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
  request: Pick<JudgeRequest, "judge" | "checker">,
  test: JudgeTest,
  run: TestRun,
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
    if (run.stderr) result.logs = clip(run.stderr);
  }
  // Hidden tests return no output at all, not even an error message: a
  // solution could print the hidden input to stderr and then crash on purpose.
  return result;
}
