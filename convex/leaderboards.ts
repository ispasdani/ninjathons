import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type QueryCtx } from "./_generated/server";
import { getCurrentUserOrNull, publicQuery } from "./lib/functions";
import { membership } from "./lib/groups";
import {
  boardKey,
  boardKind,
  groupEntries,
  isRetired,
  liveBoards,
  presentRow,
  sourcePage,
} from "./lib/leaderboards";

// Rows written per scheduled step of a rebuild, and deleted per cleanup step.
const PAGE_SIZE = 200;
const CLEANUP_SIZE = 500;
const MAX_ROWS_SHOWN = 100;

// --- Rebuilding (every 5 minutes, from crons.ts) ---

/**
 * Starts a fresh snapshot of every live board and deletes old monthly ones.
 * A build that hasn't finished by the next run is replaced by a new one.
 */
export const rebuildAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const board of liveBoards(now)) {
      const row = await ctx.db
        .query("leaderboardVersions")
        .withIndex("by_board", (q) => q.eq("board", board))
        .unique();
      const version = Math.max(row?.live ?? 0, row?.building ?? 0) + 1;
      if (row) await ctx.db.patch(row._id, { building: version });
      else await ctx.db.insert("leaderboardVersions", { board, building: version });
      await ctx.scheduler.runAfter(0, internal.leaderboards.rebuildPage, {
        board,
        version,
        cursor: null,
        rank: 0,
        countryRanks: {},
      });
    }

    for (const row of await ctx.db.query("leaderboardVersions").collect()) {
      if (isRetired(row.board, now)) {
        await ctx.scheduler.runAfter(0, internal.leaderboards.cleanup, { board: row.board, retire: true });
      }
    }
  },
});

export const rebuildPage = internalMutation({
  args: {
    board: v.string(),
    version: v.number(),
    cursor: v.union(v.string(), v.null()),
    // The last rank written, overall and per country.
    rank: v.number(),
    countryRanks: v.record(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("leaderboardVersions")
      .withIndex("by_board", (q) => q.eq("board", args.board))
      .unique();
    // Replaced by a newer build: stop; cleanup removes what this one wrote.
    if (!versions || versions.building !== args.version) return;

    const page = await sourcePage(ctx, args.board, { cursor: args.cursor, numItems: PAGE_SIZE });
    let rank = args.rank;
    const countryRanks = { ...args.countryRanks };
    for (const entry of page.page) {
      const user = await ctx.db.get(entry.userId);
      if (!user) continue;
      rank++;
      const country = user.country;
      const countryRank = country ? (countryRanks[country] = (countryRanks[country] ?? 0) + 1) : undefined;
      await ctx.db.insert("leaderboardSnapshots", {
        board: args.board,
        version: args.version,
        userId: entry.userId,
        value: entry.value,
        rank,
        country,
        countryRank,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.leaderboards.rebuildPage, {
        ...args,
        cursor: page.continueCursor,
        rank,
        countryRanks,
      });
      return;
    }
    await ctx.db.patch(versions._id, { live: args.version, building: undefined, builtAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.leaderboards.cleanup, { board: args.board, retire: false });
  },
});

/**
 * Deletes snapshot rows older than the live version, or, for a retired
 * board, all of them and the board itself.
 */
export const cleanup = internalMutation({
  args: { board: v.string(), retire: v.boolean() },
  handler: async (ctx, { board, retire }) => {
    const versions = await ctx.db
      .query("leaderboardVersions")
      .withIndex("by_board", (q) => q.eq("board", board))
      .unique();
    if (!versions) return;
    const below = retire ? Math.max(versions.live ?? 0, versions.building ?? 0) + 1 : (versions.live ?? 0);
    const rows = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_board_rank", (q) => q.eq("board", board).lt("version", below))
      .take(CLEANUP_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === CLEANUP_SIZE) {
      await ctx.scheduler.runAfter(0, internal.leaderboards.cleanup, { board, retire });
    } else if (retire) {
      await ctx.db.delete(versions._id);
    }
  },
});

// --- Reading ---

async function liveVersion(ctx: QueryCtx, board: string) {
  return await ctx.db
    .query("leaderboardVersions")
    .withIndex("by_board", (q) => q.eq("board", board))
    .unique();
}

/** The caller's live value on a board, whatever the snapshot says. */
async function liveValue(ctx: QueryCtx, board: string, userId: Id<"users">) {
  const [entry] = await groupEntries(ctx, board, [userId]);
  return entry?.value ?? null;
}

/**
 * One board in one scope, from `fromRank` (1 is the top; pass your own rank
 * minus 5 for "Jump to me"). Global and Country come from the latest
 * snapshot; Group is live and for its members only (empty for anyone else).
 * `me` is the caller's
 * own position: their live value, with the rank from the same source.
 */
export const board = publicQuery({
  args: {
    board: boardKind,
    // For the monthly board: "2026-10". Defaults to this month.
    month: v.optional(v.string()),
    scope: v.union(v.literal("global"), v.literal("country"), v.literal("group")),
    country: v.optional(v.string()),
    groupId: v.optional(v.id("groups")),
    fromRank: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let key: string;
    try {
      key = boardKey(args.board, args.month);
    } catch {
      throw new ConvexError("BAD_MONTH");
    }
    const from = Math.max(1, Math.floor(args.fromRank ?? 1));
    const limit = Math.min(MAX_ROWS_SHOWN, Math.max(1, Math.floor(args.limit ?? 50)));
    const user = await getCurrentUserOrNull(ctx);

    if (args.scope === "group") {
      // Not a member (or the group just went): an empty board, not an error,
      // so an open page doesn't break when someone is removed.
      const empty = { rows: [], builtAt: null, me: null };
      if (!user || !args.groupId) return empty;
      const group = await ctx.db.get(args.groupId);
      if (!group || group.deletedAt !== undefined || !(await membership(ctx, group._id, user._id))) return empty;
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_user", (q) => q.eq("groupId", group._id))
        .collect();
      const ranked = await groupEntries(ctx, key, members.map((m) => m.userId));
      const mine = ranked.find((r) => r.userId === user._id);
      return {
        rows: await Promise.all(ranked.slice(from - 1, from - 1 + limit).map((r) => presentRow(ctx, key, r))),
        // Live, not from a snapshot.
        builtAt: null,
        me: mine ? { rank: mine.rank, value: Math.round(mine.value) } : null,
      };
    }

    if (args.scope === "country" && !args.country) throw new ConvexError("COUNTRY_REQUIRED");
    const versions = await liveVersion(ctx, key);
    const version = versions?.live;
    const rows =
      version === undefined
        ? []
        : args.scope === "country"
          ? await ctx.db
              .query("leaderboardSnapshots")
              .withIndex("by_board_country", (q) =>
                q.eq("board", key).eq("version", version).eq("country", args.country).gte("countryRank", from),
              )
              .take(limit)
          : await ctx.db
              .query("leaderboardSnapshots")
              .withIndex("by_board_rank", (q) => q.eq("board", key).eq("version", version).gte("rank", from))
              .take(limit);

    let me = null;
    if (user) {
      const snapshot =
        version === undefined
          ? null
          : await ctx.db
              .query("leaderboardSnapshots")
              .withIndex("by_board_user", (q) => q.eq("board", key).eq("version", version).eq("userId", user._id))
              .unique();
      const value = await liveValue(ctx, key, user._id);
      const rank = args.scope === "country" ? snapshot?.countryRank : snapshot?.rank;
      if (value !== null) me = { rank: rank ?? null, value: Math.round(value) };
    }

    return {
      rows: await Promise.all(
        rows.map((r) => presentRow(ctx, key, { ...r, rank: args.scope === "country" ? r.countryRank! : r.rank })),
      ),
      builtAt: versions?.builtAt ?? null,
      me,
    };
  },
});
