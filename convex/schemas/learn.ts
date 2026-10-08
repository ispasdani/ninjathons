import { defineTable } from "convex/server";
import { v } from "convex/values";

// Lessons and tutorials (decisions §17): a page of teaching that ends in 1 to
// 3 library problems. A tutorial stands on its own and is free and public; a
// roadmap lesson belongs to one roadmap module. Seeded from learn/lessons/.
export const lessons = defineTable({
  slug: v.string(), // never changes once published
  title: v.string(),
  summary: v.string(),
  body: v.string(), // markdown
  tutorial: v.boolean(),
  exerciseIds: v.array(v.id("problems")),
  // Archived lessons are hidden, but progress and XP already earned stay.
  status: v.union(v.literal("published"), v.literal("archived")),
}).index("by_slug", ["slug"]);

// Roadmaps: an ordered path of modules, each a few lessons. Seeded from
// learn/roadmaps/. `free` marks the free preview module; everything stays
// open until Pro locks the rest in phase 8.
export const roadmaps = defineTable({
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  intro: v.string(), // markdown
  order: v.number(),
  modules: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      summary: v.string(),
      free: v.boolean(),
      lessonIds: v.array(v.id("lessons")),
    }),
  ),
  status: v.union(v.literal("published"), v.literal("archived")),
})
  .index("by_slug", ["slug"])
  .index("by_order", ["order"]);

// A player's go at a lesson: opened, then finished once every exercise is
// solved. Unfinished rows have no finishedAt and sort first in by_user_finished,
// so an accepted Submit reads only the lessons still waiting on a solve.
export const lessonProgress = defineTable({
  userId: v.id("users"),
  lessonId: v.id("lessons"),
  openedAt: v.number(),
  finishedAt: v.optional(v.number()),
})
  .index("by_user_lesson", ["userId", "lessonId"])
  .index("by_user_finished", ["userId", "finishedAt"]);

// A finished roadmap module, one row per player and module.
export const roadmapProgress = defineTable({
  userId: v.id("users"),
  roadmapId: v.id("roadmaps"),
  module: v.string(),
  finishedAt: v.number(),
}).index("by_user_roadmap", ["userId", "roadmapId", "module"]);

// Learning XP (lessons and modules) per player, all time (`period: "all"`) and
// per calendar month in UTC ("2026-10"), for the Learning board. Kept by
// lib/learn.ts next to each award; `tieBreak` is minus the time it last went up.
export const learningXp = defineTable({
  userId: v.id("users"),
  period: v.string(),
  xp: v.number(),
  tieBreak: v.number(),
})
  .index("by_user_period", ["userId", "period"])
  .index("by_period_xp", ["period", "xp", "tieBreak"]);
