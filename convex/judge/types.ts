/**
 * Types shared by the judge: the problem shapes (taken from the Convex
 * validators, so the database and the judge can't drift apart) and the
 * protocol between the judge and a code runner.
 */
import type { Infer } from "convex/values";

import type {
  checker,
  judge,
  language,
  valueType,
} from "../schemas/problems";

export type Language = Infer<typeof language>;
export type ValueType = Infer<typeof valueType>;
export type Judge = Infer<typeof judge>;
export type Signature = Extract<Judge, { mode: "function" }>["signature"];
export type Checker = Infer<typeof checker>;
export type Limits = { timeMs: number; memoryMb: number };

/**
 * One program to run against many inputs. A runner compiles once (if
 * `compile` is set), then runs `run` once per test with that test's stdin.
 * Runners never see expected outputs: verdicts are decided by the caller.
 */
export type RunJob = {
  /** Files to place in the working directory, by relative path. */
  files: Record<string, string>;
  /** Command and arguments, run once before the tests. */
  compile?: string[];
  /** Command and arguments, run once per test. */
  run: string[];
  /** stdin for each test, in order. */
  tests: string[];
  /** Wall-clock limit per test, already multiplied for the language. */
  timeLimitMs: number;
  /** Stop after the first test that crashes or times out. */
  stopOnError: boolean;
};

export type TestRunStatus = "ok" | "runtime_error" | "time_limit" | "output_limit";

export type TestRun = {
  status: TestRunStatus;
  stdout: string;
  stderr: string;
  timeMs: number;
  exitCode: number | null;
};

export type RunOutput = {
  compile?: { ok: boolean; output: string };
  tests: TestRun[];
};

/** Where code runs: Vercel Sandbox, a local process, later the browser or desktop app. */
export interface CodeRunner {
  run(job: RunJob): Promise<RunOutput>;
}
