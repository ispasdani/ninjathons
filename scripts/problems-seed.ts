/**
 * npm run problems:seed [slug ...] [-- --prod]
 *
 * Uploads problem folders to Convex, matched by slug, so re-running updates
 * instead of duplicating. Examples go into `problems`; hidden and generated
 * tests into a file referenced from `problemTests`. Uses the Convex CLI's
 * login (`npx convex run`), so it seeds your dev deployment unless --prod.
 * Then seeds the weekly sets (weekly/, decisions §15) that list any of the
 * problems seeded (every set, with no slugs); a weekly set's problems stay
 * hidden until its week starts. With no slugs, then seeds the lessons and
 * roadmaps (learn/, decisions §17).
 * Run problems:check first: this script only validates the shape.
 */
import { spawnSync } from "node:child_process";

import { allTests, checkTestTypes, generateTests, listProblemDirs, loadProblem } from "./lib/problems";
import { loadLessons, loadRoadmaps } from "./lib/learn";
import { loadWeeklySets, weeklySetOf } from "./lib/weekly";

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

async function seedOne(dir: string, setOf: Map<string, string>) {
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
    // A weekly set's problem stays hidden until its week (decisions §15).
    weeklySet: setOf.get(meta.slug),
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
  const sets = loadWeeklySets();
  const setOf = weeklySetOf(sets);
  let failed = 0;
  for (const dir of dirs) {
    try {
      await seedOne(dir, setOf);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${dir}: ${(error as Error).message}`);
    }
  }
  // Then their weekly sets, whose problems must be seeded first.
  const seeded = new Set(dirs.map((dir) => loadProblem(dir).meta.slug));
  const due = sets.filter((set) => set.problems.some((slug) => seeded.has(slug)));
  if (due.length) {
    console.log(`Seeding ${due.length} weekly sets`);
    for (const set of due) {
      try {
        const result = convexRun("weekly:seedSet", {
          slug: set.slug,
          title: set.title,
          theme: set.theme,
          order: set.order,
          problems: set.problems,
        }) as { created: boolean; started: boolean };
        const what = result.started ? "already started: title and theme updated" : result.created ? "created" : "updated";
        console.log(`  ✓ ${set.slug} ${what}`);
      } catch (error) {
        failed++;
        console.log(`  ✗ ${set.slug}: ${(error as Error).message}`);
      }
    }
  }
  // Then, when seeding everything, the lessons and the roadmaps that use them.
  if (slugs.length === 0) failed += seedLearn();
  process.exit(failed ? 1 : 0);
}

/** Seeds every lesson, then every roadmap. Returns how many failed. */
function seedLearn() {
  let failed = 0;
  const lessons = loadLessons();
  const roadmaps = loadRoadmaps();
  if (lessons.length) console.log(`Seeding ${lessons.length} lessons and ${roadmaps.length} roadmaps`);
  for (const lesson of lessons) {
    try {
      const result = convexRun("learn:seedLesson", {
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        body: lesson.body,
        tutorial: lesson.tutorial,
        exercises: lesson.exercises,
      }) as { created: boolean };
      console.log(`  ✓ ${lesson.slug} ${result.created ? "created" : "updated"}`);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${lesson.slug}: ${(error as Error).message}`);
    }
  }
  for (const roadmap of roadmaps) {
    try {
      const result = convexRun("learn:seedRoadmap", {
        slug: roadmap.slug,
        title: roadmap.title,
        summary: roadmap.summary,
        intro: roadmap.intro,
        order: roadmap.order,
        modules: roadmap.modules,
      }) as { created: boolean };
      console.log(`  ✓ ${roadmap.slug} ${result.created ? "created" : "updated"}`);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${roadmap.slug}: ${(error as Error).message}`);
    }
  }
  return failed;
}

void main();
