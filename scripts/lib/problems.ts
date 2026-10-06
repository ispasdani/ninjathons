/**
 * Reads problem folders (problems/<slug>/, docs/notes/decisions.md §7) into
 * one shape the check and seed scripts share. Only scripts import this; a
 * lint rule keeps problems/ out of app/ and components/.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { validate } from "convex-helpers/validators";
import { v, type Infer } from "convex/values";

import { runCode, type JudgeTest } from "../../convex/judge/judge";
import { EXTENSIONS, problemLanguages } from "../../convex/judge/languages";
import type { Judge, Language } from "../../convex/judge/types";
import { checkFunctionInput, checkFunctionTest } from "../../convex/judge/values";
import { checker, difficulty, language, signature } from "../../convex/schemas/problems";
import { localRunner, runPythonScript } from "./local-runner";

export const PROBLEMS_DIR = "problems";

const problemFile = v.object({
  slug: v.string(),
  title: v.string(),
  difficulty,
  tags: v.array(v.string()),
  mode: v.union(v.literal("function"), v.literal("stdio")),
  signature: v.optional(signature),
  checker,
  limits: v.object({ timeMs: v.number(), memoryMb: v.number() }),
  languages: v.union(v.literal("all"), v.array(language)),
  pool: v.union(v.literal("practice"), v.literal("ranked"), v.literal("contest")),
  status: v.union(v.literal("draft"), v.literal("beta"), v.literal("approved")),
  version: v.number(),
});
export type ProblemFile = Infer<typeof problemFile>;

export type Test = { input: string; expected: string };
export type Example = Test & { explanation?: string };
export type Solution = { file: string; language: Language; kind: "reference" | "wrong" | "slow"; source: string };

export type Problem = {
  dir: string;
  meta: ProblemFile;
  judge: Judge;
  statement: string;
  hints: string[];
  examples: Example[];
  /** Hand-written hidden tests. Generated ones come from generateTests(). */
  hidden: Test[];
  /** Inputs printed by tests/generate.py, if there is one. */
  generatedInputs: string[];
  solutions: Solution[];
};

export function listProblemDirs(only?: string[]): string[] {
  if (!existsSync(PROBLEMS_DIR)) return [];
  return readdirSync(PROBLEMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (!only?.length || only.includes(d.name)))
    .map((d) => join(PROBLEMS_DIR, d.name));
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path}: ${(error as Error).message}`);
  }
}

/** Test values are JSON in function mode and plain text in stdio mode. */
function asText(value: unknown, mode: Judge["mode"]): string {
  if (mode === "stdio") {
    if (typeof value !== "string") throw new Error("stdio tests must be strings");
    return value;
  }
  return JSON.stringify(value);
}

function readTestList(path: string, mode: Judge["mode"]): Example[] {
  const list = readJson(path);
  if (!Array.isArray(list)) throw new Error(`${path}: should be an array of tests`);
  return list.map((t, i) => {
    if (typeof t !== "object" || t === null || !("input" in t) || !("output" in t)) {
      throw new Error(`${path}[${i}]: each test needs "input" and "output"`);
    }
    const { input, output, explanation } = t as { input: unknown; output: unknown; explanation?: unknown };
    return {
      input: asText(input, mode),
      expected: asText(output, mode),
      ...(typeof explanation === "string" ? { explanation } : {}),
    };
  });
}

function readHints(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/^## Hint[^\n]*\n/m)
    .slice(1)
    .map((h) => h.trim())
    .filter(Boolean);
}

function readSolutions(dir: string): Solution[] {
  const solutionsDir = join(dir, "solutions");
  if (!existsSync(solutionsDir)) return [];
  const byExt = Object.fromEntries(Object.entries(EXTENSIONS).map(([lang, ext]) => [`.${ext}`, lang as Language]));
  return readdirSync(solutionsDir).flatMap((file): Solution[] => {
    const language = byExt[extname(file)];
    const name = basename(file, extname(file));
    const kind = name === "reference" ? "reference" : name.startsWith("wrong-") ? "wrong" : name.startsWith("slow-") ? "slow" : null;
    if (!language || !kind) return [];
    return [{ file: join(solutionsDir, file), language, kind, source: readFileSync(join(solutionsDir, file), "utf8") }];
  });
}

function runGenerator(dir: string): string[] {
  const script = join(dir, "tests", "generate.py");
  if (!existsSync(script)) return [];
  const inputs = JSON.parse(runPythonScript(script));
  if (!Array.isArray(inputs)) throw new Error(`${script} should print a JSON array of inputs`);
  return inputs.map((input) => (typeof input === "string" ? input : JSON.stringify(input)));
}

/** Loads and validates one folder. Throws with every problem found, file by file. */
export function loadProblem(dir: string): Problem {
  const raw = readJson(join(dir, "problem.json"));
  if (!validate(problemFile, raw, { throw: true })) throw new Error("invalid problem.json");
  const meta: ProblemFile = raw;

  const errors: string[] = [];
  if (meta.slug !== basename(dir)) errors.push(`slug "${meta.slug}" should match the folder name`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.slug)) errors.push("slug should be lowercase words joined by dashes");
  if (meta.mode === "function" && !meta.signature) errors.push("function mode needs a signature");
  if (meta.mode === "stdio" && meta.signature) errors.push("stdio mode has no signature");
  if (meta.checker.kind === "float" && !(meta.checker.tolerance > 0)) errors.push("float checker needs a tolerance above 0");
  if (errors.length) throw new Error(errors.join("\n"));

  const judge: Judge = meta.mode === "function" ? { mode: "function", signature: meta.signature! } : { mode: "stdio" };

  const hidden: Test[] = [];
  const hiddenJson = join(dir, "tests", "hidden.json");
  if (existsSync(hiddenJson)) hidden.push(...readTestList(hiddenJson, meta.mode));
  const hiddenDir = join(dir, "tests", "hidden");
  if (existsSync(hiddenDir)) {
    for (const file of readdirSync(hiddenDir).filter((f) => f.endsWith(".in")).sort()) {
      const out = join(hiddenDir, file.replace(/\.in$/, ".out"));
      if (!existsSync(out)) throw new Error(`${file} has no matching .out file`);
      hidden.push({ input: readFileSync(join(hiddenDir, file), "utf8"), expected: readFileSync(out, "utf8") });
    }
  }

  return {
    dir,
    meta,
    judge,
    statement: readFileSync(join(dir, "statement.md"), "utf8").trim(),
    hints: readHints(join(dir, "hints.md")),
    examples: readTestList(join(dir, "tests", "examples.json"), meta.mode),
    hidden,
    generatedInputs: runGenerator(dir),
    solutions: readSolutions(dir),
  };
}

/** Type-checks every test against the signature (function mode). Returns the problems found. */
export function checkTestTypes(problem: Problem): string[] {
  if (problem.judge.mode !== "function") return [];
  const { signature } = problem.judge;
  const errors: string[] = [];
  const all = [
    ...problem.examples.map((t, i) => [`examples[${i}]`, t] as const),
    ...problem.hidden.map((t, i) => [`hidden[${i}]`, t] as const),
  ];
  for (const [name, test] of all) {
    const error = checkFunctionTest(signature, test.input, test.expected);
    if (error) errors.push(`${name}: ${error}`);
  }
  for (const [i, input] of problem.generatedInputs.entries()) {
    const error = checkFunctionInput(signature, input);
    if (error) errors.push(`generated[${i}]: ${error}`);
  }
  return errors;
}

/** The reference that computes expected outputs for generated tests: the first language that has one. */
export function primaryReference(problem: Problem): Solution | undefined {
  return problemLanguages("all")
    .map((lang) => problem.solutions.find((s) => s.kind === "reference" && s.language === lang))
    .find(Boolean);
}

/** Runs the reference on the generated inputs. Expected outputs are never typed by hand. */
export async function generateTests(problem: Problem): Promise<Test[]> {
  if (problem.generatedInputs.length === 0) return [];
  const reference = primaryReference(problem);
  if (!reference) throw new Error("generated tests need a reference solution");
  const output = await runCode(localRunner, {
    judge: problem.judge,
    limits: { ...problem.meta.limits, timeMs: problem.meta.limits.timeMs * 10 },
    language: reference.language,
    source: reference.source,
    tests: problem.generatedInputs,
    stopAtFirstFailure: true,
  });
  if (output.compile && !output.compile.ok) throw new Error(`reference doesn't compile: ${output.compile.output}`);
  return problem.generatedInputs.map((input, i) => {
    const run = output.tests[i];
    if (run?.status !== "ok") throw new Error(`reference ${run?.status ?? "didn't run"} on generated test ${i}: ${run?.stderr ?? ""}`);
    return { input, expected: run.stdout.trimEnd() };
  });
}

/** Every test in judging order: examples first (visible), then hidden and generated. */
export function allTests(problem: Problem, generated: Test[]): JudgeTest[] {
  return [
    ...problem.examples.map((t) => ({ input: t.input, expected: t.expected, visible: true })),
    ...[...problem.hidden, ...generated].map((t) => ({ ...t, visible: false })),
  ];
}
