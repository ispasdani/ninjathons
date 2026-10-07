import type { Doc } from "../_generated/dataModel";
import { LANGUAGES, problemLanguages } from "../judge/languages";

/**
 * What the solve view and the duel screen get of a problem, with starter code
 * per language. Hidden tests live in problemTests and are never part of it.
 */
export function problemView(problem: Doc<"problems">) {
  const languages = problemLanguages(problem.languages).map((id) => ({
    id,
    label: LANGUAGES[id].label,
    version: LANGUAGES[id].version,
    starterCode:
      problem.judge.mode === "function"
        ? LANGUAGES[id].starterCode(problem.judge.signature)
        : LANGUAGES[id].stdioTemplate,
    timeLimitMs: Math.round(problem.limits.timeMs * LANGUAGES[id].timeMultiplier),
  }));
  return {
    _id: problem._id,
    slug: problem.slug,
    title: problem.title,
    statement: problem.statement,
    difficulty: problem.difficulty,
    tags: problem.tags,
    mode: problem.judge.mode,
    examples: problem.examples,
    hints: problem.hints,
    memoryLimitMb: problem.limits.memoryMb,
    languages,
  };
}
