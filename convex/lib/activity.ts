/** The profile's activity grid (decisions §18): one count per player per UTC day. */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { dayKey } from "./days";

/** Counts an accepted Submit or a finished lesson on its day. */
export async function noteActivity(ctx: MutationCtx, userId: Id<"users">, time: number) {
  const day = dayKey(time);
  const row = await ctx.db
    .query("activityDays")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
    .unique();
  if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
  else await ctx.db.insert("activityDays", { userId, day, count: 1 });
}
