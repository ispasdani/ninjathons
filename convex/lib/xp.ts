/**
 * The only way to write to xpLedger. Convex has no unique constraints, but a
 * mutation runs as one serializable transaction, so checking the key and
 * inserting in the same mutation is safe against retries and races.
 */
import type { Infer } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { xpSource } from "../schemas/progression";

export async function awardXp(
  ctx: MutationCtx,
  entry: {
    userId: Id<"users">;
    key: string;
    source: Infer<typeof xpSource>;
    amount: number;
  },
) {
  const existing = await ctx.db
    .query("xpLedger")
    .withIndex("by_user_key", (q) =>
      q.eq("userId", entry.userId).eq("key", entry.key),
    )
    .unique();
  if (existing) return { awarded: false as const };

  await ctx.db.insert("xpLedger", entry);
  return { awarded: true as const };
}
