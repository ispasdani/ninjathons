/**
 * npm run problems:check [slug ...]
 *
 * For every problem folder: validates problem.json and the tests, runs each
 * reference solution through the generated drivers and requires Accepted, and
 * requires every wrong-* solution to fail and every slow-* one to time out.
 * Runs code in the runner image, or with the local Node.js and Python
 * (scripts/lib/local-runner.ts). With no slugs, also checks the weekly sets
 * (weekly/, scripts/lib/weekly.ts) and the lessons and roadmaps (learn/,
 * scripts/lib/learn.ts).
 */
import { judgeSubmission } from "../convex/judge/judge";
import { LANGUAGES, problemLanguages } from "../convex/judge/languages";
import { allTests, checkTestTypes, generateTests, listProblemDirs, loadProblem, type Problem } from "./lib/problems";
import { checkLearn, loadLessons, loadRoadmaps } from "./lib/learn";
import { localRunner } from "./lib/local-runner";
import { checkWeeklySets, loadWeeklySets } from "./lib/weekly";

const MIN_HIDDEN = 10;
const MAX_EXAMPLE_BYTES = 16 * 1024;

async function checkProblem(problem: Problem): Promise<string[]> {
  const errors = checkTestTypes(problem);
  const { meta } = problem;
  const languages = problemLanguages(meta.languages);

  if (problem.examples.length === 0) errors.push("needs at least one example");
  for (const [i, ex] of problem.examples.entries()) {
    if (ex.input.length + ex.expected.length > MAX_EXAMPLE_BYTES) errors.push(`examples[${i}] is too big to show (16 KB max)`);
  }
  const hiddenCount = problem.hidden.length + problem.generatedInputs.length;
  if (hiddenCount < MIN_HIDDEN) errors.push(`needs at least ${MIN_HIDDEN} hidden tests, has ${hiddenCount}`);
  if (problem.hints.length === 0) errors.push("needs at least one hint in hints.md");

  const references = problem.solutions.filter((s) => s.kind === "reference");
  if (references.length === 0) errors.push("needs a solutions/reference.<ext>");
  if (!problem.solutions.some((s) => s.kind === "wrong")) errors.push("needs at least one solutions/wrong-*.<ext>");
  for (const s of problem.solutions) {
    if (!languages.includes(s.language)) errors.push(`${s.file}: ${s.language} isn't one of the problem's languages`);
  }
  if (errors.length) return errors;

  const tests = allTests(problem, await generateTests(problem));
  for (const solution of problem.solutions) {
    const verdict = await judgeSubmission(localRunner, {
      judge: problem.judge,
      checker: meta.checker,
      limits: meta.limits,
      language: solution.language,
      source: solution.source,
      tests,
      stopAtFirstFailure: solution.kind !== "reference",
    });
    const name = solution.file.replace(/\\/g, "/");
    const summary = `${verdict.status}, ${verdict.passed}/${verdict.total} passed, slowest ${verdict.timeMs} ms`;
    if (solution.kind === "reference") {
      if (verdict.status !== "accepted") {
        const failed = verdict.tests.findIndex((t) => t.status !== "accepted");
        errors.push(`${name} should be accepted: ${summary} (first failure: test ${failed}${verdict.tests[failed]?.logs ? `\n${verdict.tests[failed].logs}` : ""})`);
      } else {
        const limit = Math.round(meta.limits.timeMs * LANGUAGES[solution.language].timeMultiplier);
        console.log(`  ✓ ${name}: ${summary} (limit ${limit} ms)`);
        if (verdict.timeMs > limit / 2) {
          console.log(`    ! slowest test uses more than half the limit; consider raising limits.timeMs`);
        }
      }
    } else if (solution.kind === "wrong") {
      if (verdict.status === "accepted") errors.push(`${name} should fail but was accepted: the tests are too weak`);
      else console.log(`  ✓ ${name}: rejected (${summary})`);
    } else {
      if (verdict.status !== "time_limit") errors.push(`${name} should time out: ${summary}`);
      else console.log(`  ✓ ${name}: timed out (${summary})`);
    }
  }
  return errors;
}

async function main() {
  const dirs = listProblemDirs(process.argv.slice(2));
  if (dirs.length === 0) {
    console.error("No problem folders found.");
    process.exit(1);
  }
  let failed = 0;
  for (const dir of dirs) {
    console.log(`${dir.replace(/\\/g, "/")}`);
    let errors: string[];
    try {
      errors = await checkProblem(loadProblem(dir));
    } catch (error) {
      errors = [(error as Error).message];
    }
    for (const error of errors) console.log(`  ✗ ${error}`);
    if (errors.length) failed++;
  }
  console.log(failed ? `\n${failed} of ${dirs.length} problems failed.` : `\nAll ${dirs.length} problems passed.`);

  // The weekly sets, when checking everything.
  let setErrors: string[] = [];
  if (process.argv.length <= 2) {
    try {
      const sets = loadWeeklySets();
      setErrors = checkWeeklySets(sets);
      for (const error of setErrors) console.log(`  ✗ ${error}`);
      if (!setErrors.length) console.log(`All ${sets.length} weekly sets passed.`);
    } catch (error) {
      setErrors = [(error as Error).message];
      console.log(`  ✗ ${setErrors[0]}`);
    }
  }

  // And the lessons and roadmaps.
  let learnErrors: string[] = [];
  if (process.argv.length <= 2) {
    try {
      const lessons = loadLessons();
      const roadmaps = loadRoadmaps();
      learnErrors = checkLearn(lessons, roadmaps);
      for (const error of learnErrors) console.log(`  ✗ ${error}`);
      if (!learnErrors.length) console.log(`All ${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"} and ${roadmaps.length} ${roadmaps.length === 1 ? "roadmap" : "roadmaps"} passed.`);
    } catch (error) {
      learnErrors = [(error as Error).message];
      console.log(`  ✗ ${learnErrors[0]}`);
    }
  }
  process.exit(failed || setErrors.length || learnErrors.length ? 1 : 0);
}

void main();
