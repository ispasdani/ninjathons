/**
 * The only way to write to xpLedger. Convex has no unique constraints, but a
 * mutation runs as one serializable transaction, so checking the key and
 * inserting in the same mutation is safe against retries and races.
 */
import type { Infer } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { difficulty } from "../schemas/problems";
import type { xpSource } from "../schemas/progression";
import { checkLevelBadges } from "./badges";

// Starting values from the roadmap (docs/01, XP sources), tuned during the beta.
export const SOLVE_XP: Record<Infer<typeof difficulty>, number> = {
  easy: 10,
  medium: 20,
  hard: 40,
};

// First solve per problem per language only. Keyed by slug, which never
// changes once published (decisions §7).
export function solveKey(slug: string, language: string) {
  return `solve:${slug}:${language}`;
}

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
  if (existing) return { awarded: false as const, badges: [] };

  await ctx.db.insert("xpLedger", entry);
  // The running total on the user row, kept in the same transaction, so levels
  // and leaderboards never sum the ledger.
  const user = await ctx.db.get(entry.userId);
  if (!user) return { awarded: true as const, badges: [] };
  const now = Date.now();
  const xp = (user.xp ?? 0) + entry.amount;
  await ctx.db.patch(user._id, { xp, xpTieBreak: -now });

  // And this month's total, for the monthly Level board.
  const month = monthKey(now);
  const monthly = await ctx.db
    .query("xpMonths")
    .withIndex("by_user_month", (q) => q.eq("userId", user._id).eq("month", month))
    .unique();
  if (monthly) await ctx.db.patch(monthly._id, { xp: monthly.xp + entry.amount, tieBreak: -now });
  else await ctx.db.insert("xpMonths", { userId: user._id, month, xp: entry.amount, tieBreak: -now });

  return { awarded: true as const, badges: await checkLevelBadges(ctx, user._id, xp) };
}

/** The calendar month in UTC, "2026-10". */
export function monthKey(time: number) {
  return new Date(time).toISOString().slice(0, 7);
}
