/**
 * npm run load:test [concurrent] [rounds] [slug]
 *
 * The runner load test (phase 4, decisions §12): `concurrent` judgings start at
 * the same moment, `rounds` times, in the real Vercel Sandbox through the
 * Convex dev deployment (convex/benchmark.ts), like every player of several
 * matches pressing Submit together. Languages rotate through the problem's
 * reference solutions; one in four is a Run, the rest Submits. Default: 20
 * at once (10 matches), 3 rounds, two-sum.
 *
 * Passes when every verdict is right and nothing errors. The times are the
 * server's, from the start of judging to the verdict, sandbox start included.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

import { loadProblem, PROBLEMS_DIR } from "./lib/problems";

const CONVEX_CLI = join("node_modules", "convex", "bin", "main.js");

type Outcome = { language: string; kind: "run" | "submit"; ms?: number; status?: string; error?: string };

function judge(slug: string, language: string, source: string, kind: "run" | "submit"): Promise<Outcome> {
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
  const concurrent = Number(process.argv[2] ?? 20);
  const rounds = Number(process.argv[3] ?? 3);
  const slug = process.argv[4] ?? "two-sum";
  const references = loadProblem(join(PROBLEMS_DIR, slug)).solutions.filter((s) => s.kind === "reference");
  console.log(`${slug}: ${concurrent} at once × ${rounds} rounds, ${references.length} languages\n`);

  const all: Outcome[] = [];
  for (let round = 1; round <= rounds; round++) {
    const started = Date.now();
    const outcomes = await Promise.all(
      Array.from({ length: concurrent }, (_, i) => {
        const ref = references[(i + round) % references.length];
        return judge(slug, ref.language, ref.source, i % 4 === 3 ? "run" : "submit");
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
