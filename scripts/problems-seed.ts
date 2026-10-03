/**
 * npm run problems:seed [slug ...] [-- --prod]
 *
 * Uploads problem folders to Convex, matched by slug, so re-running updates
 * instead of duplicating. Examples go into `problems`; hidden and generated
 * tests into a file referenced from `problemTests`. Uses the Convex CLI's
 * login (`npx convex run`), so it seeds your dev deployment unless --prod.
 * Run problems:check first: this script only validates the shape.
 */
import { spawnSync } from "node:child_process";

import { allTests, checkTestTypes, generateTests, listProblemDirs, loadProblem } from "./lib/problems";

const args = process.argv.slice(2);
const prod = args.includes("--prod");
const slugs = args.filter((a) => !a.startsWith("--"));

/** Runs an internal Convex function through the CLI and returns its JSON result. */
function convexRun(fn: string, fnArgs: object): unknown {
  const result = spawnSync(
    process.execPath,
    ["node_modules/convex/bin/main.js", "run", fn, JSON.stringify(fnArgs), ...(prod ? ["--prod"] : [])],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`convex run ${fn} failed:\n${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}

async function seedOne(dir: string) {
  const problem = loadProblem(dir);
  const typeErrors = checkTestTypes(problem);
  if (typeErrors.length) throw new Error(typeErrors.join("\n"));
  const { meta, judge } = problem;

  const hidden = allTests(problem, await generateTests(problem))
    .filter((t) => !t.visible)
    .map((t) => ({ input: t.input, expectedOutput: t.expected }));
  const pkg = {
    problem: {
      slug: meta.slug,
      title: meta.title,
      statement: problem.statement,
      difficulty: meta.difficulty,
      tags: meta.tags,
      judge,
      checker: meta.checker,
      examples: problem.examples.map((e) => ({
        input: e.input,
        output: e.expected,
        ...(e.explanation ? { explanation: e.explanation } : {}),
      })),
      limits: meta.limits,
      languages: meta.languages,
      pool: meta.pool,
      version: meta.version,
      hints: problem.hints,
      status: meta.status,
    },
    hidden,
  };

  const uploadUrl = convexRun("problems:generateUploadUrl", {}) as string;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pkg),
  });
  if (!response.ok) throw new Error(`upload failed: ${response.status} ${await response.text()}`);
  const { storageId } = (await response.json()) as { storageId: string };
  const result = convexRun("problems:seedFromUpload", { upload: storageId }) as { created: boolean };
  console.log(`  ✓ ${meta.slug} v${meta.version} ${result.created ? "created" : "updated"}, ${hidden.length} hidden tests`);
}

async function main() {
  const dirs = listProblemDirs(slugs);
  if (dirs.length === 0) {
    console.error("No problem folders found.");
    process.exit(1);
  }
  console.log(`Seeding ${dirs.length} problems to the ${prod ? "PRODUCTION" : "dev"} deployment`);
  let failed = 0;
  for (const dir of dirs) {
    try {
      await seedOne(dir);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${dir}: ${(error as Error).message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

void main();
