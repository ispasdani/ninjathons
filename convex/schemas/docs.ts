import { defineTable } from "convex/server";
import { v } from "convex/values";

// Which reference a page belongs to (decisions §8, §17). JavaScript pages
// serve TypeScript too; HTML and CSS serve the HTML and CSS challenges.
export const docArea = v.union(v.literal("javascript"), v.literal("html"), v.literal("css"), v.literal("python"));

// The docs library: curated MDN and Python reference pages, converted to
// Markdown by `npm run docs:import` and seeded here. Public, like the
// sources; each page keeps its source URL and the set's license line.
export const docPages = defineTable({
  set: v.union(v.literal("mdn"), v.literal("python")),
  // Unique within the set, e.g. "web/javascript/reference/global_objects/array/map"
  // or "library/heapq".
  path: v.string(),
  title: v.string(),
  // Where it sits, for the results list: ["JavaScript", "Array"].
  breadcrumb: v.array(v.string()),
  area: docArea,
  body: v.string(), // markdown
  sourceUrl: v.string(),
  // Shown first, before anything is searched for.
  featured: v.boolean(),
  // The import that last wrote it; pages a newer import didn't write are removed.
  importId: v.string(),
})
  .index("by_set_path", ["set", "path"])
  .index("by_set_import", ["set", "importId"])
  .index("by_area_featured", ["area", "featured"])
  .searchIndex("search_title", { searchField: "title", filterFields: ["area"] })
  .searchIndex("search_body", { searchField: "body", filterFields: ["area"] });

// One row per imported set: its version and license line, shown under every page.
export const docSets = defineTable({
  set: v.union(v.literal("mdn"), v.literal("python")),
  version: v.string(),
  license: v.string(),
  importId: v.string(),
  pages: v.number(),
  importedAt: v.number(),
}).index("by_set", ["set"]);

// A doc page opened during a match (decisions §9): match results say how many
// pages each player used. Practice reading isn't logged.
export const docViews = defineTable({
  userId: v.id("users"),
  matchId: v.id("matches"),
  pageId: v.id("docPages"),
})
  .index("by_match_user_page", ["matchId", "userId", "pageId"])
  .index("by_user", ["userId"]);
