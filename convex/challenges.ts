import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { normalizeCode, randomCode } from "./lib/codes";
import { userMutation, userQuery } from "./lib/functions";
import { createMatch, openMatchOf } from "./lib/matches";
import { PROVISIONAL_GAMES } from "./lib/ratings";
import { usernameKey } from "./lib/usernames";
import { difficulty, language } from "./schemas/problems";

// The challenger has to be around when it's accepted, so challenges are short-lived.
export const CHALLENGE_TTL_MS = 15 * 60_000;
export const MAX_PENDING = 5;
// Ranked challenges: both players past their provisional games, and close in
// rating, so friends can't farm rating off each other (roadmap, Compete).
export const RANKED_MAX_GAP = 400;

async function rating1v1(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("ratings")
    .withIndex("by_user_area", (q) => q.eq("userId", userId).eq("area", "1v1"))
    .unique();
}

/** Why two players can't play a ranked challenge, or null if they can. `b` may be unknown (a link). */
async function rankedProblem(ctx: QueryCtx, a: Id<"users">, b?: Id<"users">) {
  const ra = await rating1v1(ctx, a);
  const rb = b ? await rating1v1(ctx, b) : null;
  if (!ra || ra.games < PROVISIONAL_GAMES) return "RANKED_NEEDS_GAMES";
  if (!b) return null;
  if (!rb || rb.games < PROVISIONAL_GAMES) return "OPPONENT_NEEDS_GAMES";
  if (Math.abs(ra.rating - rb.rating) >= RANKED_MAX_GAP) return "RATING_GAP";
  return null;
}

function isOpen(challenge: Doc<"challenges">, now: number) {
  return challenge.status === "pending" && challenge.expiresAt > now;
}

async function byCode(ctx: QueryCtx, code: string) {
  return await ctx.db
    .query("challenges")
    .withIndex("by_code", (q) => q.eq("code", normalizeCode(code)))
    .unique();
}

/**
 * Challenges a player by username, or makes a link anyone can accept when no
 * username is given. Ranked challenges check the limits now and again on accept.
 */
export const create = userMutation({
  args: {
    username: v.optional(v.string()),
    ranked: v.boolean(),
    difficulty: v.optional(difficulty),
    language,
  },
  handler: async (ctx, args) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    const now = Date.now();
    const pending = (
      await ctx.db
        .query("challenges")
        .withIndex("by_from_status", (q) => q.eq("fromId", ctx.user._id).eq("status", "pending"))
        .collect()
    ).filter((c) => isOpen(c, now));
    if (pending.length >= MAX_PENDING) throw new ConvexError("TOO_MANY_CHALLENGES");

    let toId: Id<"users"> | undefined;
    const name = args.username?.trim().replace(/^@/, "");
    if (name) {
      const to = await ctx.db
        .query("users")
        .withIndex("by_usernameKey", (q) => q.eq("usernameKey", usernameKey(name)))
        .unique();
      if (!to) throw new ConvexError("UNKNOWN_PLAYER");
      if (to._id === ctx.user._id) throw new ConvexError("CHALLENGE_SELF");
      if (pending.some((c) => c.toId === to._id)) throw new ConvexError("DUPLICATE_CHALLENGE");
      toId = to._id;
    }
    if (args.ranked) {
      const problem = await rankedProblem(ctx, ctx.user._id, toId);
      if (problem) throw new ConvexError(problem);
    }

    let code = randomCode();
    while (await byCode(ctx, code)) code = randomCode();
    const challengeId = await ctx.db.insert("challenges", {
      fromId: ctx.user._id,
      toId,
      code,
      ranked: args.ranked,
      // Ranked difficulty always follows the ratings.
      difficulty: args.ranked ? undefined : args.difficulty,
      fromLanguage: args.language,
      status: "pending",
      expiresAt: now + CHALLENGE_TTL_MS,
    });
    return { challengeId, code };
  },
});

function summary(c: Doc<"challenges">, from: Doc<"users"> | null, to: Doc<"users"> | null) {
  return {
    _id: c._id,
    code: c.code,
    ranked: c.ranked,
    difficulty: c.difficulty ?? null,
    from: from?.username ?? "Deleted player",
    to: to?.username ?? null,
    expiresAt: c.expiresAt,
  };
}

/** The caller's open challenges: sent to them, and sent by them. */
export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [incoming, outgoing] = await Promise.all([
      ctx.db
        .query("challenges")
        .withIndex("by_to_status", (q) => q.eq("toId", ctx.user._id).eq("status", "pending"))
        .collect(),
      ctx.db
        .query("challenges")
        .withIndex("by_from_status", (q) => q.eq("fromId", ctx.user._id).eq("status", "pending"))
        .collect(),
    ]);
    return {
      incoming: await Promise.all(
        incoming.filter((c) => isOpen(c, now)).map(async (c) => summary(c, await ctx.db.get(c.fromId), ctx.user)),
      ),
      outgoing: await Promise.all(
        outgoing
          .filter((c) => isOpen(c, now))
          .map(async (c) => summary(c, ctx.user, c.toId ? await ctx.db.get(c.toId) : null)),
      ),
    };
  },
});

/**
 * A challenge for its link page: who sent it, the settings, and whether the
 * caller can accept it (and if not, why).
 */
export const get = userQuery({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const c = await byCode(ctx, code);
    if (!c) return null;
    const mine = c.fromId === ctx.user._id;
    if (c.toId && c.toId !== ctx.user._id && !mine) return null;
    const from = await ctx.db.get(c.fromId);
    const to = c.toId ? await ctx.db.get(c.toId) : null;
    const now = Date.now();
    let problem: string | null = null;
    if (c.status === "accepted") problem = "ACCEPTED";
    else if (c.status !== "pending") problem = "CHALLENGE_CLOSED";
    else if (c.expiresAt <= now) problem = "CHALLENGE_EXPIRED";
    else if (mine) problem = "OWN_CHALLENGE";
    else if (c.ranked) problem = await rankedProblem(ctx, ctx.user._id, c.fromId);
    return {
      ...summary(c, from, to),
      mine,
      status: c.status,
      matchId: c.matchId && (mine || c.toId === ctx.user._id) ? c.matchId : null,
      problem,
    };
  },
});

/** Accepts a challenge (by its code) and starts the match. */
export const accept = userMutation({
  args: { code: v.string(), language },
  handler: async (ctx, { code, language }) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    const c = await byCode(ctx, code);
    if (!c || (c.toId && c.toId !== ctx.user._id)) throw new ConvexError("CHALLENGE_NOT_FOUND");
    if (c.fromId === ctx.user._id) throw new ConvexError("OWN_CHALLENGE");
    if (c.status !== "pending") throw new ConvexError("CHALLENGE_CLOSED");
    if (c.expiresAt <= Date.now()) throw new ConvexError("CHALLENGE_EXPIRED");
    if (await openMatchOf(ctx, ctx.user._id)) throw new ConvexError("ALREADY_IN_MATCH");
    if (await openMatchOf(ctx, c.fromId)) throw new ConvexError("OPPONENT_IN_MATCH");
    if (c.ranked) {
      // Ratings may have moved since it was sent.
      const problem = await rankedProblem(ctx, ctx.user._id, c.fromId);
      if (problem) throw new ConvexError(problem);
    }

    const matchId = await createMatch(ctx, {
      players: [
        { userId: c.fromId, language: c.fromLanguage },
        { userId: ctx.user._id, language },
      ],
      ranked: c.ranked,
      source: "challenge",
      difficulty: c.difficulty,
    });
    if (!matchId) throw new ConvexError("NO_PROBLEMS");
    await ctx.db.patch(c._id, { status: "accepted", toId: ctx.user._id, matchId });
    return matchId;
  },
});

export const decline = userMutation({
  args: { id: v.id("challenges") },
  handler: async (ctx, { id }) => {
    const c = await ctx.db.get(id);
    if (!c || c.toId !== ctx.user._id) throw new ConvexError("CHALLENGE_NOT_FOUND");
    if (c.status === "pending") await ctx.db.patch(id, { status: "declined" });
  },
});

export const cancel = userMutation({
  args: { id: v.id("challenges") },
  handler: async (ctx, { id }) => {
    const c = await ctx.db.get(id);
    if (!c || c.fromId !== ctx.user._id) throw new ConvexError("CHALLENGE_NOT_FOUND");
    if (c.status === "pending") await ctx.db.patch(id, { status: "cancelled" });
  },
});
