import { userQuery } from "./lib/functions";
import { ratingSummary } from "./lib/ratings";

/**
 * The caller's own ratings, one per area they've played ranked in. Their own
 * provisional rating is shown to them; other players see it after 10 games.
 */
export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("ratings")
      .withIndex("by_user_area", (q) => q.eq("userId", ctx.user._id))
      .collect();
    return rows.map(ratingSummary);
  },
});
