import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { userMutation, userQuery } from "./lib/functions";
import { openMatchOf } from "./lib/matches";
import { groupPlayers } from "./lib/matchmaking";
import { DEFAULT_OPENSKILL } from "./lib/openskill";
import { createGame, leave1v1Queue, leaveTerritoryWaiting, openGameOf } from "./lib/territory";
import { language } from "./schemas/problems";

// How often the pass runs while anyone is waiting.
const PASS_EVERY_MS = 2_000;
// The page pings every 10 s; a row not seen for this long is dropped.
export const STALE_AFTER_MS = 30_000;

async function passNow(ctx: MutationCtx) {
  await ctx.scheduler.runAfter(0, internal.territoryQueue.pass, {});
}

/** Joins the ranked Territory queue, or switches language if already in it. */
export const join = userMutation({
  args: { language },
  handler: async (ctx, { language }) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    if ((await openMatchOf(ctx, ctx.user._id)) || (await openGameOf(ctx, ctx.user._id))) {
      throw new ConvexError("ALREADY_IN_MATCH");
    }
    const now = Date.now();
    const row = await ctx.db
      .query("territoryQueue")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { language, lastSeenAt: now });
      return;
    }
    // One thing at a time: out of the 1v1 queue and any lobby.
    await leave1v1Queue(ctx, ctx.user._id);
    await leaveTerritoryWaiting(ctx, ctx.user._id);
    const rating = await ctx.db
      .query("ratings")
      .withIndex("by_user_area", (q) => q.eq("userId", ctx.user._id).eq("area", "territory"))
      .unique();
    await ctx.db.insert("territoryQueue", {
      userId: ctx.user._id,
      language,
      rating: rating?.rating ?? DEFAULT_OPENSKILL.mu,
      joinedAt: now,
      lastSeenAt: now,
    });
    await passNow(ctx);
  },
});

export const leave = userMutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("territoryQueue")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

/** Sent every 10 s by the Find a match page while it's open. */
export const heartbeat = userMutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("territoryQueue")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (row) await ctx.db.patch(row._id, { lastSeenAt: Date.now() });
  },
});

/** The caller's place in the queue (or null) and how many others are waiting. */
export const status = userQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("territoryQueue").withIndex("by_joined").take(500);
    const mine = rows.find((r) => r.userId === ctx.user._id);
    return {
      queued: mine ? { language: mine.language, joinedAt: mine.joinedAt } : null,
      waiting: rows.filter((r) => r.userId !== ctx.user._id).length,
    };
  },
});

/**
 * One grouping pass: drops stale rows and players already playing, groups
 * the rest by rating, and makes a ranked game for each group. Reschedules
 * itself while anyone is still waiting.
 */
export const pass = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("territoryQueue").withIndex("by_joined").take(500);
    const waiting = [];
    for (const row of rows) {
      const busy = (await openMatchOf(ctx, row.userId)) || (await openGameOf(ctx, row.userId));
      if (now - row.lastSeenAt > STALE_AFTER_MS || busy) await ctx.db.delete(row._id);
      else waiting.push(row);
    }

    const byUser = new Map(waiting.map((r) => [r.userId, r]));
    const groups = groupPlayers(
      waiting.map((r) => ({ id: r.userId, rating: r.rating, joinedAt: r.joinedAt })),
      now,
    );
    let placed = 0;
    for (const group of groups) {
      const gameId = await createGame(ctx, {
        players: group.map((id) => ({ userId: id, language: byUser.get(id)!.language })),
        ranked: true,
        source: "queue",
      });
      // createGame takes them out of the queue. No problems to play: leave everyone queued.
      if (!gameId) break;
      placed += group.length;
    }

    const state = await ctx.db.query("territoryMatchmaking").first();
    const loopAlive = state !== null && state.nextPassAt > now;
    if (waiting.length - placed > 0 && !loopAlive) {
      const nextPassAt = now + PASS_EVERY_MS;
      if (state) await ctx.db.patch(state._id, { nextPassAt });
      else await ctx.db.insert("territoryMatchmaking", { nextPassAt });
      await ctx.scheduler.runAt(nextPassAt, internal.territoryQueue.pass, {});
    }
  },
});
