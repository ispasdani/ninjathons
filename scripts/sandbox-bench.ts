/**
 * npm run sandbox:bench [slug]
 *
 * Times Run and Submit of every reference solution of a problem (default
 * two-sum) in the real Vercel Sandbox, through the Convex dev deployment
 * (convex/benchmark.ts). The sandbox image is whatever SANDBOX_IMAGE says in
 * the Convex environment. Each language runs twice: the first is often slower.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { loadProblem, PROBLEMS_DIR } from "./lib/problems";

const CONVEX_CLI = join("node_modules", "convex", "bin", "main.js");

type Result = { ms: number; status: string; passed: number; total: number; compileOutput?: string; logs?: string };

function judge(slug: string, language: string, source: string, kind: "run" | "submit"): Result {
  const args = JSON.stringify({ slug, language, source, kind });
  // The Convex CLI through Node directly: no shell, so the JSON needs no quoting.
  const result = spawnSync(process.execPath, [CONVEX_CLI, "run", "benchmark:judgeSource", args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout) as Result;
}

const slug = process.argv[2] ?? "two-sum";
const problem = loadProblem(join(PROBLEMS_DIR, slug));
const references = problem.solutions.filter((s) => s.kind === "reference");
console.log(`${slug}: ${references.length} references, times include sandbox start-up\n`);
console.log("language     run 1   run 2   submit 1  submit 2  verdict");
for (const ref of references) {
  const times: string[] = [];
  let verdict = "";
  for (const kind of ["run", "run", "submit", "submit"] as const) {
    const r = judge(slug, ref.language, ref.source, kind);
    times.push(`${(r.ms / 1000).toFixed(2)} s`.padEnd(kind === "run" ? 8 : 10));
    verdict = `${r.status} ${r.passed}/${r.total}`;
    if (r.status !== "accepted") verdict += ` ${(r.compileOutput ?? r.logs ?? "").slice(0, 300)}`;
  }
  console.log(`${ref.language.padEnd(13)}${times.join("")}${verdict}`);
}
