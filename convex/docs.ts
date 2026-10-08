import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation } from "./_generated/server";
import { publicQuery, userMutation } from "./lib/functions";
import { docArea } from "./schemas/docs";

const RESULTS = 20;
// Pages written per mutation while seeding, and removed per cleanup step.
const BATCH_BYTES = 2_000_000;
const CLEANUP_SIZE = 200;

const pageInput = v.object({
  path: v.string(),
  title: v.string(),
  breadcrumb: v.array(v.string()),
  area: docArea,
  body: v.string(),
  sourceUrl: v.string(),
  featured: v.boolean(),
});
const setName = v.union(v.literal("mdn"), v.literal("python"));

// --- Seeding (npm run docs:import) ---

/** Unpacks an uploaded set and writes it in batches, then removes the pages it no longer has. */
export const seedFromUpload = internalAction({
  args: { upload: v.id("_storage") },
  handler: async (ctx, { upload }): Promise<{ written: number; removed: number }> => {
    const blob = await ctx.storage.get(upload);
    if (!blob) throw new Error("upload not found");
    const set = JSON.parse(await blob.text()) as {
      set: "mdn" | "python";
      version: string;
      license: string;
      pages: (typeof pageInput.type)[];
    };
    await ctx.storage.delete(upload);
    const importId = `${set.set}:${Date.now()}`;

    let batch: (typeof pageInput.type)[] = [];
    let bytes = 0;
    for (const p of set.pages) {
      if (bytes + p.body.length > BATCH_BYTES && batch.length) {
        await ctx.runMutation(internal.docs.seedBatch, { set: set.set, importId, pages: batch });
        batch = [];
        bytes = 0;
      }
      batch.push(p);
      bytes += p.body.length;
    }
    if (batch.length) await ctx.runMutation(internal.docs.seedBatch, { set: set.set, importId, pages: batch });

    let removed = 0;
    for (;;) {
      const n: number = await ctx.runMutation(internal.docs.removeStale, { set: set.set, importId });
      removed += n;
      if (n < CLEANUP_SIZE) break;
    }
    await ctx.runMutation(internal.docs.recordSet, {
      set: set.set,
      version: set.version,
      license: set.license,
      importId,
      pages: set.pages.length,
    });
    return { written: set.pages.length, removed };
  },
});

export const seedBatch = internalMutation({
  args: { set: setName, importId: v.string(), pages: v.array(pageInput) },
  handler: async (ctx, { set, importId, pages }) => {
    for (const p of pages) {
      const existing = await ctx.db
        .query("docPages")
        .withIndex("by_set_path", (q) => q.eq("set", set).eq("path", p.path))
        .unique();
      if (existing) await ctx.db.replace(existing._id, { ...p, set, importId });
      else await ctx.db.insert("docPages", { ...p, set, importId });
    }
  },
});

/** Removes up to CLEANUP_SIZE pages of the set that this import didn't write; returns how many. */
export const removeStale = internalMutation({
  args: { set: setName, importId: v.string() },
  handler: async (ctx, { set, importId }) => {
    const rows = await ctx.db
      .query("docPages")
      .withIndex("by_set_import", (q) => q.eq("set", set))
      .filter((q) => q.neq(q.field("importId"), importId))
      .take(CLEANUP_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});

export const recordSet = internalMutation({
  args: { set: setName, version: v.string(), license: v.string(), importId: v.string(), pages: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("docSets")
      .withIndex("by_set", (q) => q.eq("set", args.set))
      .unique();
    const row = { ...args, importedAt: Date.now() };
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("docSets", row);
  },
});

// --- Reading ---

/**
 * Pages of the given areas matching `q`: title matches first, then matches
 * in the text. With no query, the featured pages to start from. Public, like
 * the sources.
 */
export const search = publicQuery({
  args: { areas: v.array(docArea), q: v.string() },
  handler: async (ctx, { areas, q }) => {
    const query = q.trim().slice(0, 100);
    const found = new Map<Id<"docPages">, { _id: Id<"docPages">; title: string; breadcrumb: string[]; area: string }>();
    const keep = (rows: { _id: Id<"docPages">; title: string; breadcrumb: string[]; area: string }[]) => {
      for (const r of rows) if (found.size < RESULTS && !found.has(r._id)) found.set(r._id, r);
    };
    for (const area of areas.slice(0, 2)) {
      if (!query) {
        keep(await ctx.db.query("docPages").withIndex("by_area_featured", (x) => x.eq("area", area).eq("featured", true)).take(RESULTS));
        continue;
      }
      keep(await ctx.db.query("docPages").withSearchIndex("search_title", (x) => x.search("title", query).eq("area", area)).take(RESULTS));
    }
    if (query) {
      for (const area of areas.slice(0, 2)) {
        keep(await ctx.db.query("docPages").withSearchIndex("search_body", (x) => x.search("body", query).eq("area", area)).take(RESULTS));
      }
    }
    // A page named exactly what was asked for comes first: "map" finds
    // Array.prototype.map() before the dozen pages about Map.
    const word = query.toLowerCase().replace(/\(\)$/, "");
    const exact = (title: string) => {
      const name = title.toLowerCase().replace(/\(\)$/, "");
      return name === word || name.endsWith(`.${word}`) || name.endsWith(`: ${word}`);
    };
    const results = [...found.values()];
    if (word) results.sort((a, b) => Number(exact(b.title)) - Number(exact(a.title)));
    return results.map(({ _id, title, breadcrumb, area }) => ({ _id, title, breadcrumb, area }));
  },
});

/** One page with its license line, by id or by its set and path (for links between pages). */
export const page = publicQuery({
  args: { id: v.optional(v.id("docPages")), set: v.optional(setName), path: v.optional(v.string()) },
  handler: async (ctx, { id, set, path }) => {
    const row = id
      ? await ctx.db.get(id)
      : set && path
        ? await ctx.db
            .query("docPages")
            .withIndex("by_set_path", (q) => q.eq("set", set).eq("path", path))
            .unique()
        : null;
    if (!row) return null;
    const source = await ctx.db
      .query("docSets")
      .withIndex("by_set", (q) => q.eq("set", row.set))
      .unique();
    return {
      _id: row._id,
      set: row.set,
      title: row.title,
      breadcrumb: row.breadcrumb,
      area: row.area,
      body: row.body,
      sourceUrl: row.sourceUrl,
      license: source?.license ?? "",
      version: source?.version ?? "",
    };
  },
});

// --- Matches (decisions §9) ---

/**
 * Notes that a player opened a doc page during their 1v1 match, once per
 * page, for the result ("used 2 doc pages"). Only while the match is on.
 */
export const noteMatchView = userMutation({
  args: { matchId: v.id("matches"), pageId: v.id("docPages") },
  handler: async (ctx, { matchId, pageId }) => {
    const match = await ctx.db.get(matchId);
    if (!match || match.status !== "active" || Date.now() >= match.endsAt) return;
    const player = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .filter((q) => q.eq(q.field("userId"), ctx.user._id))
      .unique();
    if (!player) throw new ConvexError("MATCH_NOT_FOUND");
    if (!(await ctx.db.get(pageId))) throw new ConvexError("PAGE_NOT_FOUND");
    const seen = await ctx.db
      .query("docViews")
      .withIndex("by_match_user_page", (q) => q.eq("matchId", matchId).eq("userId", ctx.user._id).eq("pageId", pageId))
      .unique();
    if (!seen) await ctx.db.insert("docViews", { userId: ctx.user._id, matchId, pageId });
  },
});
