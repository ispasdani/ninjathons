import { getCurrentUserOrNull, publicQuery } from "./lib/functions";
import { BADGES } from "./lib/badges";

/**
 * Every badge with its rarity, the share of players (users with at least one
 * solve) who hold it, and, when signed in, when the caller earned it.
 */
export const list = publicQuery({
  args: {},
  handler: async (ctx) => {
    const counts = new Map(
      (await ctx.db.query("badgeCounts").collect()).map((c) => [c.badgeId, c.holders]),
    );
    const players = counts.get("first-solve") ?? 0;

    const user = await getCurrentUserOrNull(ctx);
    const earned = new Map(
      user
        ? (
            await ctx.db
              .query("userBadges")
              .withIndex("by_user_badge", (q) => q.eq("userId", user._id))
              .collect()
          ).map((b) => [b.badgeId, b._creationTime])
        : [],
    );

    return BADGES.map((badge) => ({
      ...badge,
      rarity: players ? (counts.get(badge.id) ?? 0) / players : 0,
      earnedAt: earned.get(badge.id) ?? null,
    }));
  },
});
