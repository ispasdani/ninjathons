/**
 * Turns a submission into a verdict: build the program for the language, hand
 * it to a runner, then compare each output with the expected one here, where
 * the expected outputs live. Used by Convex (Vercel Sandbox runner) and by the
 * problems:check script (local runner), so both judge exactly the same way.
 */
import type { TestResult, Verdict, VerdictStatus } from "../schemas/submissions";
import { outputMatches } from "./checker";
import { DRIVE_FILES } from "./harness";
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
  /**
   * The last `count` tests' inputs are on this drive (convex/testDrives.ts),
   * so the runner mounts it instead of uploading them. Vercel Sandbox only.
   */
  drive?: { name: string; count: number };
};

const MAX_SHOWN = 2000;

function clip(text: string): string {
  return text.length > MAX_SHOWN ? text.slice(0, MAX_SHOWN) + "\n... (truncated)" : text;
}

/** `runCode({ language, source, tests, limits })` from decisions §5. */
export async function runCode(
  runner: CodeRunner,
  request: Pick<JudgeRequest, "judge" | "language" | "source" | "limits" | "stopAtFirstFailure" | "drive"> & {
    tests: string[];
    /** How many of the first tests are visible. */
    visible?: number;
  },
): Promise<RunOutput> {
  const spec = LANGUAGES[request.language];
  const { judge } = request;
  const tokens = judge.mode === "function" && spec.wire === "tokens";
  const { drive } = request;
  // The drive's inputs are already in both formats; only the rest go in the job.
  const inline = drive ? request.tests.slice(0, request.tests.length - drive.count) : request.tests;
  const output = await runner.run({
    ...spec.program(judge, request.source, request.limits.memoryMb),
    tests: tokens ? inline.map((input) => encodeArgs(judge.signature, input)) : inline,
    drive: drive && { name: drive.name, file: tokens ? DRIVE_FILES.tokens : DRIVE_FILES.json, count: drive.count },
    batch: judge.mode === "function",
    visible: request.visible,
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
  const output = await runCode(runner, {
    ...request,
    tests: request.tests.map((t) => t.input),
    visible: request.tests.filter((t) => t.visible).length,
  });
  return decideVerdict(request, output);
}

export function decideVerdict(
  request: Pick<JudgeRequest, "judge" | "checker" | "tests" | "stopAtFirstFailure" | "language" | "source">,
  output: RunOutput,
): Verdict {
  const total = request.tests.length;
  const sourceLines = request.source.split("\n").length;
  const spec = LANGUAGES[request.language];
  const missing = (error: string) =>
    request.judge.mode === "function" && spec.missingEntry(error, sourceLines, request.judge.signature);
  if (output.compile && !output.compile.ok) {
    const compileOutput = missing(output.compile.output)
      ? missingEntryMessage(request, "The compiler said:", output.compile.output)
      : output.compile.output;
    return { status: "compile_error", passed: 0, total, timeMs: 0, compileOutput, tests: [] };
  }
  // Interpreted languages find out when the driver calls the function. Every
  // test would fail the same way, so it's reported once, like a compile error.
  const first = output.tests[0];
  if (first?.status === "runtime_error" && missing(first.stderr)) {
    const error = spec.cleanError(first.stderr, sourceLines);
    return {
      status: "compile_error",
      passed: 0,
      total,
      timeMs: 0,
      compileOutput: missingEntryMessage(request, "The error was:", error),
      tests: [],
    };
  }

  const tests: TestResult[] = [];
  let status: VerdictStatus = "accepted";
  let passed = 0;
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

/**
 * In place of an error that points into the driver, which the user never
 * wrote or sees (decisions §8, known gaps): what the driver looks for, the
 * starter code as the shape to match, then the original error.
 */
function missingEntryMessage(
  request: Pick<JudgeRequest, "judge" | "language">,
  label: string,
  original: string,
): string {
  if (request.judge.mode !== "function") return original;
  const spec = LANGUAGES[request.language];
  return [
    `Your code needs a function named ${spec.entryName(request.judge.signature)}, with the parameters and return type of the starter code. Check the spelling (names are case-sensitive) and the types.`,
    "",
    "The starter code:",
    "",
    spec.starterCode(request.judge.signature).trimEnd(),
    "",
    label,
    original.trim(),
  ].join("\n");
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
