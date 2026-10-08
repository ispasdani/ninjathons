import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { LANGUAGES } from "./judge/languages";
import type { Language } from "./judge/types";
import { userMutation, userQuery } from "./lib/functions";
import { createMatch, currentRating, openMatchOf } from "./lib/matches";
import { pairPlayers } from "./lib/matchmaking";
import { openGameOf } from "./lib/territory";
import { language } from "./schemas/problems";

// How often the pass runs while anyone is waiting.
const PASS_EVERY_MS = 2_000;
// The page pings every 10 s; a row not seen for this long is dropped.
export const STALE_AFTER_MS = 30_000;

/**
 * Starts a pass now. A pass keeps itself scheduled every 2 s while anyone is
 * queued; this one takes over that loop only if none is running.
 */
async function passNow(ctx: MutationCtx) {
  await ctx.scheduler.runAfter(0, internal.queue.pass, {});
}

/** Joins the ranked queue, or switches language if already in it. */
export const join = userMutation({
  args: { language },
  handler: async (ctx, { language }) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    if ((await openMatchOf(ctx, ctx.user._id)) || (await openGameOf(ctx, ctx.user._id))) {
      throw new ConvexError("ALREADY_IN_MATCH");
    }
    const now = Date.now();
    const row = await ctx.db
      .query("matchQueue")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { language, lastSeenAt: now });
      return;
    }
    await ctx.db.insert("matchQueue", {
      userId: ctx.user._id,
      language,
      rating: await currentRating(ctx, ctx.user._id),
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
      .query("matchQueue")
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
      .query("matchQueue")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (row) await ctx.db.patch(row._id, { lastSeenAt: Date.now() });
  },
});

/**
 * The caller's place in the queue (or null), how many others are waiting, and
 * the languages to pick from. The match itself comes from matches.current.
 */
export const status = userQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("matchQueue").withIndex("by_joined").take(500);
    const mine = rows.find((r) => r.userId === ctx.user._id);
    return {
      queued: mine ? { language: mine.language, joinedAt: mine.joinedAt } : null,
      waiting: rows.filter((r) => r.userId !== ctx.user._id).length,
      languages: (Object.keys(LANGUAGES) as Language[]).map((id) => ({ id, label: LANGUAGES[id].label })),
    };
  },
});

/**
 * One pairing pass: drops stale rows and players already in a match, pairs
 * the rest by rating, and makes a ranked match for each pair. Reschedules
 * itself while anyone is still waiting.
 */
export const pass = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("matchQueue").withIndex("by_joined").take(500);
    const waiting = [];
    for (const row of rows) {
      const busy = (await openMatchOf(ctx, row.userId)) || (await openGameOf(ctx, row.userId));
      if (now - row.lastSeenAt > STALE_AFTER_MS || busy) {
        await ctx.db.delete(row._id);
      } else {
        waiting.push(row);
      }
    }

    const byUser = new Map(waiting.map((r) => [r.userId, r]));
    const pairs = pairPlayers(
      waiting.map((r) => ({ id: r.userId, rating: r.rating, joinedAt: r.joinedAt })),
      now,
    );
    let matched = 0;
    for (const [a, b] of pairs) {
      const players = [byUser.get(a)!, byUser.get(b)!];
      const matchId = await createMatch(ctx, {
        players: players.map((p) => ({ userId: p.userId, language: p.language })),
        ranked: true,
        source: "queue",
      });
      // createMatch takes both out of the queue. No problem to play: leave everyone queued.
      if (!matchId) break;
      matched += 2;
    }

    // Keep the loop going while anyone waits; a pass started by a join only
    // takes over when no loop is scheduled.
    const state = await ctx.db.query("matchmaking").first();
    const loopAlive = state !== null && state.nextPassAt > now;
    if (waiting.length - matched > 0 && !loopAlive) {
      const nextPassAt = now + PASS_EVERY_MS;
      if (state) await ctx.db.patch(state._id, { nextPassAt });
      else await ctx.db.insert("matchmaking", { nextPassAt });
      await ctx.scheduler.runAt(nextPassAt, internal.queue.pass, {});
    }
  },
});
