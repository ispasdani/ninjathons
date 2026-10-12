import { ConvexError, v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Grants or removes the admin role (decisions §19). Internal, so only the
 * Convex CLI can run it:
 *   npx convex run admin:setRole '{"username": "dani", "admin": true}'
 */
export const setRole = internalMutation({
  args: { username: v.string(), admin: v.boolean() },
  handler: async (ctx, { username, admin }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_usernameKey", (q) => q.eq("usernameKey", username.trim().toLowerCase()))
      .unique();
    if (!user) throw new ConvexError("UNKNOWN_PLAYER");
    await ctx.db.patch(user._id, { role: admin ? "admin" : undefined });
    return user._id;
  },
});
