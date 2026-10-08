import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { LANGUAGES, problemLanguages } from "../judge/languages";
import { weekKey } from "./days";

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

/**
 * Whether players can see and solve a problem: not a draft, and not in a
 * weekly set that hasn't started (decisions §15). Every public read checks it.
 */
export function isListed(problem: Doc<"problems">) {
  return problem.status !== "draft" && !problem.unreleased;
}

/**
 * Problems of weekly sets not finished at `time` (unstarted, or running that
 * week). The daily never picks them, so a daily can't give a set away.
 */
export async function unfinishedWeeklyProblems(ctx: QueryCtx, time: number) {
  const week = weekKey(time);
  const held = new Set<Id<"problems">>();
  for (const set of await ctx.db.query("weeklySets").collect()) {
    if (set.week === undefined || set.week >= week) for (const id of set.problemIds) held.add(id);
  }
  return held;
}
