/**
 * npm run load:test [--local] [concurrent] [rounds] [slug]
 *
 * The runner load test (phase 4, decisions §12): `concurrent` judgings start at
 * the same moment, `rounds` times, like every player of several matches
 * pressing Submit together. Languages rotate through the problem's reference
 * solutions; one in four is a Run, the rest Submits. Default: 20 at once (10
 * matches), 3 rounds, two-sum.
 *
 * Without --local: in the real Vercel Sandbox through the Convex dev
 * deployment (convex/benchmark.ts). The real test, Vercel's limits included;
 * it uses the plan's sandboxes (Hobby: 5,000 a month). Times are the
 * server's, from the start of judging to the verdict.
 *
 * With --local: in the local runner (the Docker image, or Node.js and Python
 * on this computer), free and repeatable. It checks our side under load
 * (harness, drivers, isolation, verdicts), not Vercel's.
 *
 * Passes when every verdict is right and nothing errors.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

import { judgeSubmission, type JudgeTest } from "../convex/judge/judge";
import { localRunner, runnerMode } from "./lib/local-runner";
import { allTests, generateTests, loadProblem, PROBLEMS_DIR, type Problem, type Solution } from "./lib/problems";

const CONVEX_CLI = join("node_modules", "convex", "bin", "main.js");

type Outcome = { language: string; kind: "run" | "submit"; ms?: number; status?: string; error?: string };

/** Judges in this process with the local runner, against the problem's own tests. */
async function judgeLocally(problem: Problem, tests: JudgeTest[], solution: Solution, kind: "run" | "submit"): Promise<Outcome> {
  const { language } = solution;
  const started = Date.now();
  try {
    const verdict = await judgeSubmission(localRunner, {
      judge: problem.judge,
      checker: problem.meta.checker,
      limits: problem.meta.limits,
      language,
      source: solution.source,
      tests: kind === "run" ? tests.filter((t) => t.visible) : tests,
      stopAtFirstFailure: kind === "submit",
    });
    return { language, kind, ms: Date.now() - started, status: verdict.status };
  } catch (error) {
    return { language, kind, error: String(error) };
  }
}

/** Judges in Vercel Sandbox through the dev deployment. */
function judgeOnVercel(slug: string, language: string, source: string, kind: "run" | "submit"): Promise<Outcome> {
  const args = JSON.stringify({ slug, language, source, kind });
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CONVEX_CLI, "run", "benchmark:judgeSource", args]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      if (code !== 0) return resolve({ language, kind, error: (stderr || stdout).trim().split("\n").slice(-3).join(" ") });
      const result = JSON.parse(stdout) as { ms: number; status: string };
      resolve({ language, kind, ms: result.ms, status: result.status });
    });
  });
}

function percentile(sorted: number[], p: number) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : NaN;
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(2)} s`;
}

async function main() {
  const local = process.argv.includes("--local");
  const [concurrentArg, roundsArg, slugArg] = process.argv.slice(2).filter((a) => a !== "--local");
  const concurrent = Number(concurrentArg ?? 20);
  const rounds = Number(roundsArg ?? 3);
  const slug = slugArg ?? "two-sum";
  const problem = loadProblem(join(PROBLEMS_DIR, slug));
  // Without the runner image, only JavaScript, TypeScript and Python run locally.
  const hostOnly = local && runnerMode() === "host";
  const references = problem.solutions.filter(
    (s) => s.kind === "reference" && (!hostOnly || ["javascript", "typescript", "python"].includes(s.language)),
  );
  const tests = local ? allTests(problem, await generateTests(problem)) : [];
  const judge = (solution: Solution, kind: "run" | "submit") =>
    local
      ? judgeLocally(problem, tests, solution, kind)
      : judgeOnVercel(slug, solution.language, solution.source, kind);
  const where = local ? `the local runner (${runnerMode()})` : "Vercel Sandbox";
  console.log(`${slug}: ${concurrent} at once × ${rounds} rounds, ${references.length} languages, in ${where}\n`);

  const all: Outcome[] = [];
  for (let round = 1; round <= rounds; round++) {
    const started = Date.now();
    const outcomes = await Promise.all(
      Array.from({ length: concurrent }, (_, i) => {
        const ref = references[(i + round) % references.length];
        return judge(ref, i % 4 === 3 ? "run" : "submit");
      }),
    );
    all.push(...outcomes);
    const failed = outcomes.filter((o) => o.error || o.status !== "accepted").length;
    console.log(`round ${round}: all back in ${seconds(Date.now() - started)}, ${failed} failed`);
  }

  console.log("\nkind    language     n   p50      p95      max");
  const groups = new Map<string, number[]>();
  for (const o of all) {
    if (o.ms === undefined || o.status !== "accepted") continue;
    for (const key of [`${o.kind} all`, `${o.kind} ${o.language}`]) groups.set(key, [...(groups.get(key) ?? []), o.ms]);
  }
  for (const [key, times] of [...groups].sort()) {
    times.sort((a, b) => a - b);
    const [kind, language] = key.split(" ");
    console.log(
      `${kind.padEnd(8)}${language.padEnd(13)}${String(times.length).padEnd(4)}${seconds(percentile(times, 50)).padEnd(9)}${seconds(percentile(times, 95)).padEnd(9)}${seconds(times[times.length - 1])}`,
    );
  }

  const problems = all.filter((o) => o.error || o.status !== "accepted");
  for (const o of problems) console.log(`✗ ${o.kind} ${o.language}: ${o.error ?? o.status}`);
  console.log(problems.length ? `\nFAILED: ${problems.length} of ${all.length}` : `\nAll ${all.length} accepted.`);
  process.exitCode = problems.length ? 1 : 0;
}

main();
