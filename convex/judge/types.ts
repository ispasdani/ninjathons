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
  /** Command and arguments, run once per test, or once per batch with `batch`. */
  run: string[];
  /**
   * Function mode: the driver runs many tests per process (framing in
   * harness.ts), so a runtime starts twice per Submit, not once per test.
   */
  batch?: boolean;
  /**
   * How many of the first tests are visible (their output is shown). With
   * `batch`, they run in a process of their own, apart from the hidden ones.
   */
  visible?: number;
  /** stdin for each test, in order. */
  tests: string[];
  /** Wall-clock limit per test, already multiplied for the language. */
  timeLimitMs: number;
  /** Stop after the first test that crashes or times out. */
  stopOnError: boolean;
  /**
   * Which image the job needs in Vercel Sandbox: Vercel's managed image
   * (Node.js and Python, starts fastest) or our runner image with every
   * compiler. Local runners always use the runner image.
   */
  image: SandboxImage;
  /**
   * Set by the runner, not the language: compile and run the user's code as
   * `nobody` with every capability dropped, in a folder only it can use, after
   * deleting the job file. Then the code can't read the job (the hidden test
   * inputs) or the harness's memory. Needs a harness that may switch user
   * (Vercel Sandbox, or root in the local container); off on the host.
   */
  isolate?: boolean;
  /**
   * More tests after `tests`, read by the harness from a drive mounted at
   * DRIVE_DIR (Vercel Sandbox only): `file` is a gzipped JSON array of stdin
   * strings, already in the language's wire format.
   */
  drive?: { name: string; file: string; count: number };
};

export type SandboxImage = "managed" | "runner";

export type TestRunStatus = "ok" | "runtime_error" | "time_limit" | "memory_limit" | "output_limit";

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
  /**
   * Waits for clean-up started by `run` (stopping a sandbox). Callers save the
   * verdict first and call this after, so the user doesn't wait for it.
   */
  close?(): Promise<void>;
}
