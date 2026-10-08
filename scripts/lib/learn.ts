/**
 * Reads lessons and roadmaps (decisions §17). A lesson is learn/lessons/<slug>/
 * with lesson.json (title, summary, whether it's a tutorial, exercise slugs)
 * and lesson.md; a roadmap is learn/roadmaps/<slug>/ with roadmap.json (title,
 * summary, order, modules) and intro.md. Exercises are ordinary folders in
 * problems/. Shared by the check and seed scripts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { validate } from "convex-helpers/validators";
import { v, type Infer } from "convex/values";

import { ROADMAP_BADGES } from "../../convex/lib/badges";
import { listProblemDirs, loadMeta } from "./problems";
import { loadWeeklySets, weeklySetOf } from "./weekly";

export const LESSONS_DIR = "learn/lessons";
export const ROADMAPS_DIR = "learn/roadmaps";
const MIN_EXERCISES = 1;
const MAX_EXERCISES = 3;
const MIN_MODULES = 4;
const MAX_MODULES = 6;
const MIN_MODULE_LESSONS = 2;
const MAX_MODULE_LESSONS = 4;

const lessonFile = v.object({
  title: v.string(),
  summary: v.string(),
  tutorial: v.boolean(),
  exercises: v.array(v.string()),
});

const roadmapFile = v.object({
  title: v.string(),
  summary: v.string(),
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
});

export type Lesson = Infer<typeof lessonFile> & { slug: string; body: string };
export type Roadmap = Infer<typeof roadmapFile> & { slug: string; intro: string };

function folders(root: string) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function markdown(file: string) {
  return existsSync(file) ? readFileSync(file, "utf8").trim() : "";
}

export function loadLessons(): Lesson[] {
  return folders(LESSONS_DIR).map((slug) => {
    const dir = join(LESSONS_DIR, slug);
    const json = JSON.parse(readFileSync(join(dir, "lesson.json"), "utf8"));
    if (!validate(lessonFile, json)) throw new Error(`${dir}/lesson.json doesn't match the lesson format`);
    return { ...json, slug, body: markdown(join(dir, "lesson.md")) };
  });
}

export function loadRoadmaps(): Roadmap[] {
  return folders(ROADMAPS_DIR)
    .map((slug) => {
      const dir = join(ROADMAPS_DIR, slug);
      const json = JSON.parse(readFileSync(join(dir, "roadmap.json"), "utf8"));
      if (!validate(roadmapFile, json)) throw new Error(`${dir}/roadmap.json doesn't match the roadmap format`);
      return { ...json, slug, intro: markdown(join(dir, "intro.md")) };
    })
    .sort((a, b) => a.order - b.order);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Everything wrong with the lessons and roadmaps, as messages; empty when they're fine. */
export function checkLearn(lessons: Lesson[], roadmaps: Roadmap[]): string[] {
  const errors: string[] = [];
  const problems = new Map(listProblemDirs().map(loadMeta).map((meta) => [meta.slug, meta]));
  const inWeekly = weeklySetOf(loadWeeklySets());

  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  for (const lesson of lessons) {
    const name = `${LESSONS_DIR}/${lesson.slug}`;
    if (!SLUG.test(lesson.slug)) errors.push(`${name}: the folder name isn't a slug (lowercase words and hyphens)`);
    if (!lesson.body) errors.push(`${name}: lesson.md is missing or empty`);
    if (!lesson.summary.trim()) errors.push(`${name}: needs a summary`);
    const count = lesson.exercises.length;
    if (count < MIN_EXERCISES || count > MAX_EXERCISES) {
      errors.push(`${name}: has ${count} exercises; a lesson has ${MIN_EXERCISES} to ${MAX_EXERCISES}`);
    }
    // A weekly set's problem can be an exercise; it's left out of the lesson until its week.
    if (lesson.exercises.length && lesson.exercises.every((slug) => inWeekly.has(slug))) {
      errors.push(`${name}: needs at least one exercise outside the weekly sets, so it can be finished before they run`);
    }
    for (const slug of lesson.exercises) {
      const meta = problems.get(slug);
      if (!meta) errors.push(`${name}: no problem folder for ${slug}`);
      else if (meta.status === "draft") errors.push(`${name}: ${slug} is a draft`);
    }
  }

  const placed = new Map<string, string>();
  const orders = new Map<number, string>();
  const badges = new Set(ROADMAP_BADGES.map((b) => b.slug));
  for (const roadmap of roadmaps) {
    const name = `${ROADMAPS_DIR}/${roadmap.slug}`;
    if (!roadmap.intro) errors.push(`${name}: intro.md is missing or empty`);
    if (!badges.has(roadmap.slug)) errors.push(`${name}: no badge for this roadmap in ROADMAP_BADGES (convex/lib/badges.ts)`);
    if (orders.has(roadmap.order)) errors.push(`${name}: order ${roadmap.order} is also ${orders.get(roadmap.order)}'s`);
    orders.set(roadmap.order, roadmap.slug);
    const count = roadmap.modules.length;
    if (count < MIN_MODULES || count > MAX_MODULES) {
      errors.push(`${name}: has ${count} modules; a roadmap has ${MIN_MODULES} to ${MAX_MODULES}`);
    }
    // Exactly the first module is the free preview (Pro, phase 8).
    roadmap.modules.forEach((mod, i) => {
      if (mod.free !== (i === 0)) {
        errors.push(`${name}: module ${mod.slug} ${i === 0 ? "must be free (the first one is)" : "can't be free; only the first is"}`);
      }
    });
    const moduleSlugs = new Set<string>();
    for (const mod of roadmap.modules) {
      const where = `${name}, module ${mod.slug}`;
      if (moduleSlugs.has(mod.slug)) errors.push(`${where}: the slug is used twice`);
      moduleSlugs.add(mod.slug);
      const n = mod.lessons.length;
      if (n < MIN_MODULE_LESSONS || n > MAX_MODULE_LESSONS) {
        errors.push(`${where}: has ${n} lessons; a module has ${MIN_MODULE_LESSONS} to ${MAX_MODULE_LESSONS}`);
      }
      for (const slug of mod.lessons) {
        const lesson = bySlug.get(slug);
        if (!lesson) {
          errors.push(`${where}: no lesson folder for ${slug}`);
          continue;
        }
        // Tutorials can be reused anywhere; a roadmap lesson lives in one mod.
        if (lesson.tutorial) continue;
        if (placed.has(slug)) errors.push(`${where}: ${slug} is already in ${placed.get(slug)}`);
        placed.set(slug, `${roadmap.slug}/${mod.slug}`);
      }
    }
  }
  for (const lesson of lessons) {
    if (!lesson.tutorial && !placed.has(lesson.slug)) {
      errors.push(`${LESSONS_DIR}/${lesson.slug}: isn't a tutorial and isn't in any roadmap module`);
    }
  }
  return errors;
}
