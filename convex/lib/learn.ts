/**
 * Lessons, modules and roadmaps (decisions §17). A lesson is finished once
 * it's been opened signed in and every exercise is solved, in any language
 * and in any order, solves from before included; a module when all its
 * lessons are; a roadmap when all its modules are. Checked when a lesson is
 * opened and on every accepted Submit.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { grantBadge } from "./badges";
import { isListed } from "./problems";
import { awardXp, monthKey } from "./xp";

// Roadmap, XP sources: once per lesson, once per mod.
export const LESSON_XP = 15;
export const MODULE_XP = 100;

export function lessonKey(slug: string) {
  return `lesson:${slug}`;
}

export function moduleKey(roadmap: string, module: string) {
  return `module:${roadmap}:${module}`;
}

/** Whether the user has solved a problem, in any language and from anywhere. */
export async function hasSolved(ctx: QueryCtx, userId: Id<"users">, slug: string) {
  // ";" sorts right after ":", so this is every "solve:<slug>:<language>".
  const entry = await ctx.db
    .query("xpLedger")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).gte("key", `solve:${slug}:`).lt("key", `solve:${slug};`))
    .first();
  return entry !== null;
}

/**
 * The lesson's exercises that players can see, in order, with whether the user
 * has solved each. A weekly set's problem stays out until its week (decisions §15).
 */
export async function exercisesOf(ctx: QueryCtx, lesson: Doc<"lessons">, userId: Id<"users"> | null) {
  const exercises = [];
  for (const id of lesson.exerciseIds) {
    const problem = await ctx.db.get(id);
    if (!problem || !isListed(problem)) continue;
    exercises.push({
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      solved: userId ? await hasSolved(ctx, userId, problem.slug) : false,
    });
  }
  return exercises;
}

export async function progressOf(ctx: QueryCtx, userId: Id<"users">, lessonId: Id<"lessons">) {
  return await ctx.db
    .query("lessonProgress")
    .withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lessonId))
    .unique();
}

/** Adds learning XP to the player's all-time and monthly totals, for the Learning board. */
async function addLearningXp(ctx: MutationCtx, userId: Id<"users">, amount: number, now: number) {
  for (const period of ["all", monthKey(now)]) {
    const row = await ctx.db
      .query("learningXp")
      .withIndex("by_user_period", (q) => q.eq("userId", userId).eq("period", period))
      .unique();
    if (row) await ctx.db.patch(row._id, { xp: row.xp + amount, tieBreak: -now });
    else await ctx.db.insert("learningXp", { userId, period, xp: amount, tieBreak: -now });
  }
}

async function awardLearning(
  ctx: MutationCtx,
  userId: Id<"users">,
  entry: { key: string; source: "lesson" | "module"; amount: number },
  now: number,
) {
  const result = await awardXp(ctx, { userId, ...entry });
  if (result.awarded) await addLearningXp(ctx, userId, entry.amount, now);
  return result;
}

export type LearnOutcome = {
  // Finished now.
  lessons: { slug: string; title: string }[];
  modules: { roadmap: string; module: string; title: string }[];
  xp: number;
  badges: string[];
  levelUp?: number;
};

function emptyOutcome(): LearnOutcome {
  return { lessons: [], modules: [], xp: 0, badges: [] };
}

/**
 * Finishes the lesson if it's opened and every exercise is solved, then any
 * module and roadmap that finishes with it. Adds what was earned to `outcome`.
 */
async function tryFinish(
  ctx: MutationCtx,
  userId: Id<"users">,
  progress: Doc<"lessonProgress">,
  outcome: LearnOutcome,
  now: number,
) {
  if (progress.finishedAt !== undefined) return;
  const lesson = await ctx.db.get(progress.lessonId);
  if (!lesson || lesson.status !== "published") return;
  // Exercises hidden for now (a weekly set's, before its week) don't count yet,
  // but a lesson needs at least one to finish.
  const exercises = await exercisesOf(ctx, lesson, userId);
  if (exercises.length === 0 || exercises.some((e) => !e.solved)) return;

  await ctx.db.patch(progress._id, { finishedAt: now });
  outcome.lessons.push({ slug: lesson.slug, title: lesson.title });
  const xp = await awardLearning(ctx, userId, { key: lessonKey(lesson.slug), source: "lesson", amount: LESSON_XP }, now);
  if (xp.awarded) {
    outcome.xp += LESSON_XP;
    outcome.badges.push(...xp.badges);
    outcome.levelUp = xp.levelUp ?? outcome.levelUp;
  }
  if (await grantBadge(ctx, userId, "first-lesson")) outcome.badges.push("first-lesson");

  // Modules using this lesson. Three roadmaps at launch, so reading them all is cheap.
  for (const roadmap of await ctx.db.query("roadmaps").withIndex("by_order").collect()) {
    if (roadmap.status !== "published") continue;
    for (const mod of roadmap.modules) {
      if (!mod.lessonIds.includes(lesson._id)) continue;
      await tryFinishModule(ctx, userId, roadmap, mod, outcome, now);
    }
  }
}

async function tryFinishModule(
  ctx: MutationCtx,
  userId: Id<"users">,
  roadmap: Doc<"roadmaps">,
  mod: Doc<"roadmaps">["modules"][number],
  outcome: LearnOutcome,
  now: number,
) {
  const done = await ctx.db
    .query("roadmapProgress")
    .withIndex("by_user_roadmap", (q) => q.eq("userId", userId).eq("roadmapId", roadmap._id).eq("module", mod.slug))
    .unique();
  if (done) return;
  for (const lessonId of mod.lessonIds) {
    const progress = await progressOf(ctx, userId, lessonId);
    if (progress?.finishedAt === undefined) return;
  }

  await ctx.db.insert("roadmapProgress", { userId, roadmapId: roadmap._id, module: mod.slug, finishedAt: now });
  outcome.modules.push({ roadmap: roadmap.slug, module: mod.slug, title: mod.title });
  const xp = await awardLearning(
    ctx,
    userId,
    { key: moduleKey(roadmap.slug, mod.slug), source: "module", amount: MODULE_XP },
    now,
  );
  if (xp.awarded) {
    outcome.xp += MODULE_XP;
    outcome.badges.push(...xp.badges);
    outcome.levelUp = xp.levelUp ?? outcome.levelUp;
  }

  const finished = await ctx.db
    .query("roadmapProgress")
    .withIndex("by_user_roadmap", (q) => q.eq("userId", userId).eq("roadmapId", roadmap._id))
    .collect();
  const finishedSlugs = new Set(finished.map((row) => row.module));
  if (roadmap.modules.every((m) => finishedSlugs.has(m.slug))) {
    if (await grantBadge(ctx, userId, `roadmap-${roadmap.slug}`)) outcome.badges.push(`roadmap-${roadmap.slug}`);
  }
}

/**
 * Records that the user opened a lesson (once), and finishes it at once if
 * its exercises are already solved.
 */
export async function openLesson(ctx: MutationCtx, userId: Id<"users">, lesson: Doc<"lessons">) {
  const now = Date.now();
  const outcome = emptyOutcome();
  let progress = await progressOf(ctx, userId, lesson._id);
  if (!progress) {
    const id = await ctx.db.insert("lessonProgress", { userId, lessonId: lesson._id, openedAt: now });
    progress = (await ctx.db.get(id))!;
  }
  await tryFinish(ctx, userId, progress, outcome, now);
  return outcome;
}

/**
 * After an accepted Submit: finishes any opened lesson that was waiting on
 * this problem. Returns null when nothing finished.
 */
export async function recordLessonSolve(ctx: MutationCtx, userId: Id<"users">, problemId: Id<"problems">) {
  const now = Date.now();
  const outcome = emptyOutcome();
  const waiting = await ctx.db
    .query("lessonProgress")
    .withIndex("by_user_finished", (q) => q.eq("userId", userId).eq("finishedAt", undefined))
    .collect();
  for (const progress of waiting) {
    const lesson = await ctx.db.get(progress.lessonId);
    if (lesson?.exerciseIds.includes(problemId)) await tryFinish(ctx, userId, progress, outcome, now);
  }
  return outcome.lessons.length ? outcome : null;
}
