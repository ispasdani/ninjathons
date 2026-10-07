import { ConvexError, v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { userMutation, userQuery } from "./lib/functions";
import { createGhostMatch, findRecording } from "./lib/ghosts";
import { openMatchOf, playersOf, settle } from "./lib/matches";
import { language } from "./schemas/problems";

/** Whether there's a ghost to race, for the Play page. */
export const available = userQuery({
  args: {},
  handler: async (ctx) => (await findRecording(ctx, ctx.user._id)) !== null,
});

/** Leaves the queue and starts an unranked race against a recorded solve. */
export const start = userMutation({
  args: { language },
  handler: async (ctx, { language }) => {
    if (!ctx.user.username) throw new ConvexError("USERNAME_REQUIRED");
    if (await openMatchOf(ctx, ctx.user._id)) throw new ConvexError("ALREADY_IN_MATCH");
    const recording = await findRecording(ctx, ctx.user._id);
    if (!recording) throw new ConvexError("NO_GHOSTS");
    return await createGhostMatch(ctx, { userId: ctx.user._id, language, recording });
  },
});

/** One recorded Submit of the ghost, at the moment it came back in the original match. */
export const step = internalMutation({
  args: { matchId: v.id("matches"), passed: v.number(), total: v.number(), accepted: v.boolean() },
  handler: async (ctx, { matchId, passed, total, accepted }) => {
    const match = await ctx.db.get(matchId);
    if (match?.status !== "active" || match.timeUp) return;
    const ghost = (await playersOf(ctx, matchId)).find((p) => p.ghost);
    // The recording's player deleted their account: the ghost is gone.
    if (!ghost) return;
    const now = Date.now();
    await ctx.db.patch(ghost._id, {
      submits: ghost.submits + 1,
      total,
      ...(passed > ghost.bestPassed ? { bestPassed: passed, bestAt: now } : {}),
      ...(accepted && ghost.solvedAt === undefined ? { solvedAt: now } : {}),
    });
    await ctx.db.insert("matchEvents", { matchId, userId: ghost.userId, kind: "submit", passed, total, accepted });
    await settle(ctx, matchId);
  },
});
