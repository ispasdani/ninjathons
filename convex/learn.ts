import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type QueryCtx } from "./_generated/server";
import { getCurrentUserOrNull, hasPro, publicQuery, userMutation } from "./lib/functions";
import { exercisesOf, LESSON_XP, MODULE_XP, openLesson, progressOf } from "./lib/learn";

// --- Seeding (npm run problems:seed, through `npx convex run`) ---

/** Inserts or updates a lesson from learn/lessons/<slug>/. Its exercises must be seeded first. */
export const seedLesson = internalMutation({
  args: {
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    body: v.string(),
    tutorial: v.boolean(),
    exercises: v.array(v.string()),
  },
  handler: async (ctx, { exercises, ...lesson }) => {
    const exerciseIds: Id<"problems">[] = [];
    for (const slug of exercises) {
      const problem = await ctx.db
        .query("problems")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!problem) throw new Error(`${lesson.slug}: problem ${slug} isn't seeded`);
      exerciseIds.push(problem._id);
    }
    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_slug", (q) => q.eq("slug", lesson.slug))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { ...lesson, exerciseIds, status: "published" });
    else await ctx.db.insert("lessons", { ...lesson, exerciseIds, status: "published" });
    return { created: !existing };
  },
});

/** Inserts or updates a roadmap from learn/roadmaps/<slug>/. Its lessons must be seeded first. */
export const seedRoadmap = internalMutation({
  args: {
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    intro: v.string(),
    order: v.number(),
    modules: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        summary: v.string(),
        free: v.boolean(),
        lessons: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, { modules, ...roadmap }) => {
    const resolved = [];
    for (const { lessons, ...mod } of modules) {
      const lessonIds: Id<"lessons">[] = [];
      for (const slug of lessons) {
        const lesson = await ctx.db
          .query("lessons")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique();
        if (!lesson) throw new Error(`${roadmap.slug}: lesson ${slug} isn't seeded`);
        lessonIds.push(lesson._id);
      }
      resolved.push({ ...mod, lessonIds });
    }
    const existing = await ctx.db
      .query("roadmaps")
      .withIndex("by_slug", (q) => q.eq("slug", roadmap.slug))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { ...roadmap, modules: resolved, status: "published" });
    else await ctx.db.insert("roadmaps", { ...roadmap, modules: resolved, status: "published" });
    return { created: !existing };
  },
});

// --- Reading ---

type LessonState = "new" | "opened" | "finished";

async function lessonState(ctx: QueryCtx, userId: Id<"users"> | null, lessonId: Id<"lessons">): Promise<LessonState> {
  if (!userId) return "new";
  const progress = await progressOf(ctx, userId, lessonId);
  return !progress ? "new" : progress.finishedAt === undefined ? "opened" : "finished";
}

async function publishedRoadmaps(ctx: QueryCtx) {
  const all = await ctx.db.query("roadmaps").withIndex("by_order").collect();
  return all.filter((r) => r.status === "published");
}

async function moduleLessons(ctx: QueryCtx, mod: Doc<"roadmaps">["modules"][number]) {
  const lessons = [];
  for (const id of mod.lessonIds) {
    const lesson = await ctx.db.get(id);
    if (lesson?.status === "published") lessons.push(lesson);
  }
  return lessons;
}

/**
 * A roadmap lesson outside its roadmap's free module is Pro (decisions §17,
 * §18): its text goes only to Pro players, and nobody else can open it.
 * Tutorials are free wherever they appear; a lesson in no roadmap is free.
 */
async function lessonLocked(ctx: QueryCtx, user: Doc<"users"> | null, lesson: Doc<"lessons">) {
  if (lesson.tutorial) return false;
  const inPaidModule = (await publishedRoadmaps(ctx)).some((roadmap) =>
    roadmap.modules.some((mod) => !mod.free && mod.lessonIds.includes(lesson._id)),
  );
  return inPaidModule && !(await hasPro(ctx, user));
}

/**
 * The Learn page: the roadmaps with how far you've got, and every tutorial.
 * Public; signed in, the progress is yours.
 */
export const overview = publicQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    const userId = user?._id ?? null;

    const roadmaps = [];
    for (const roadmap of await publishedRoadmaps(ctx)) {
      let lessons = 0;
      let finished = 0;
      for (const mod of roadmap.modules) {
        for (const lesson of await moduleLessons(ctx, mod)) {
          lessons++;
          if ((await lessonState(ctx, userId, lesson._id)) === "finished") finished++;
        }
      }
      roadmaps.push({
        slug: roadmap.slug,
        title: roadmap.title,
        summary: roadmap.summary,
        modules: roadmap.modules.length,
        lessons,
        finished,
      });
    }

    // Tutorials are few (about 20 at launch); the table holds only lessons.
    const tutorials = [];
    for (const lesson of await ctx.db.query("lessons").collect()) {
      if (!lesson.tutorial || lesson.status !== "published") continue;
      tutorials.push({
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        exercises: lesson.exerciseIds.length,
        state: await lessonState(ctx, userId, lesson._id),
      });
    }
    tutorials.sort((a, b) => a.title.localeCompare(b.title));
    return { roadmaps, tutorials, xp: { lesson: LESSON_XP, module: MODULE_XP } };
  },
});

/**
 * One roadmap as a path: its modules in order, each with its lessons and,
 * signed in, how far you've got. The outline is public (decisions §17).
 */
export const roadmap = publicQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const roadmap = await ctx.db
      .query("roadmaps")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!roadmap || roadmap.status !== "published") return null;
    const user = await getCurrentUserOrNull(ctx);
    const userId = user?._id ?? null;

    const modules = [];
    for (const mod of roadmap.modules) {
      const lessons = [];
      for (const lesson of await moduleLessons(ctx, mod)) {
        lessons.push({
          slug: lesson.slug,
          title: lesson.title,
          summary: lesson.summary,
          tutorial: lesson.tutorial,
          exercises: lesson.exerciseIds.length,
          state: await lessonState(ctx, userId, lesson._id),
        });
      }
      modules.push({
        slug: mod.slug,
        title: mod.title,
        summary: mod.summary,
        free: mod.free,
        lessons,
        finished: lessons.length > 0 && lessons.every((l) => l.state === "finished"),
      });
    }
    return {
      slug: roadmap.slug,
      title: roadmap.title,
      summary: roadmap.summary,
      intro: roadmap.intro,
      modules,
      xp: { lesson: LESSON_XP, module: MODULE_XP },
    };
  },
});

/**
 * A lesson or tutorial: its text, exercises (solved or not, signed in), your
 * progress, and where it sits in a roadmap. A locked lesson (lessonLocked)
 * comes without its text and with `locked: true`.
 */
export const lesson = publicQuery({
  // The roadmap it was opened from, when it's a tutorial in several.
  args: { slug: v.string(), roadmap: v.optional(v.string()) },
  handler: async (ctx, { slug, roadmap: from }) => {
    const lesson = await ctx.db
      .query("lessons")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!lesson || lesson.status !== "published") return null;
    const user = await getCurrentUserOrNull(ctx);
    const userId = user?._id ?? null;

    // The roadmap module it's in, with the lessons either side. A tutorial
    // can be in several: the one it was opened from, else the first by order.
    let place = null;
    const roadmaps = await publishedRoadmaps(ctx);
    roadmaps.sort((a, b) => Number(b.slug === from) - Number(a.slug === from));
    for (const roadmap of roadmaps) {
      for (const mod of roadmap.modules) {
        const lessons = await moduleLessons(ctx, mod);
        const at = lessons.findIndex((l) => l._id === lesson._id);
        if (at === -1) continue;
        const next = lessons[at + 1] ?? null;
        place = {
          roadmap: { slug: roadmap.slug, title: roadmap.title },
          module: { slug: mod.slug, title: mod.title, free: mod.free },
          position: at + 1,
          of: lessons.length,
          previous: at > 0 ? { slug: lessons[at - 1].slug, title: lessons[at - 1].title } : null,
          next: next ? { slug: next.slug, title: next.title } : null,
        };
        break;
      }
      if (place) break;
    }

    const exercises = await exercisesOf(ctx, lesson, userId);
    const progress = userId ? await progressOf(ctx, userId, lesson._id) : null;
    const locked = await lessonLocked(ctx, user, lesson);
    return {
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      body: locked ? null : lesson.body,
      locked,
      tutorial: lesson.tutorial,
      exercises,
      place,
      me: progress ? { openedAt: progress.openedAt, finishedAt: progress.finishedAt ?? null } : null,
      xp: LESSON_XP,
    };
  },
});

// --- Progress ---

/**
 * Called when a signed-in player opens a lesson: records the opening and
 * finishes the lesson at once if its exercises are already solved.
 */
export const open = userMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const lesson = await ctx.db
      .query("lessons")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!lesson || lesson.status !== "published") throw new ConvexError("LESSON_NOT_FOUND");
    // A locked lesson isn't recorded, so it can't finish until the player is Pro.
    if (await lessonLocked(ctx, ctx.user, lesson)) throw new ConvexError("PRO_REQUIRED");
    const outcome = await openLesson(ctx, ctx.user._id, lesson);
    return { xp: outcome.xp, badges: outcome.badges, modules: outcome.modules, levelUp: outcome.levelUp ?? null };
  },
});
