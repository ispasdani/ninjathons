/**
 * Badge definitions and the rules that grant them (roadmap, Progression;
 * decisions §13). Badges give no XP and, once earned, are never taken away.
 * Badges from solves, levels and 1v1 exist so far; the rest are added with
 * their phase.
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { LANGUAGES } from "../judge/languages";
import type { Language } from "../judge/types";
import { TITLES, levelForXp } from "./levels";
import { PROVISIONAL_GAMES, TIERS, tierFor } from "./ratings";

export type BadgeGroup = "milestones" | "difficulty" | "languages" | "levels" | "1v1" | "territory" | "challenges" | "learn";

export type Badge = {
  // Stored in userBadges; never changes once released.
  id: string;
  group: BadgeGroup;
  // Placeholder names, like the titles.
  name: string;
  description: string;
};

const SOLVE_MILESTONES = [10, 50, 100, 500];
const LANGUAGE_SOLVES = 50;
const POLYGLOT_LANGUAGES = 5;
export const STREAK_BADGES = [7, 30, 100];
// The launch roadmaps (decisions §17), by slug: one badge each for finishing it.
export const ROADMAP_BADGES = [
  { slug: "programming-basics", title: "Programming basics", name: "Basics done" },
  { slug: "data-structures-and-algorithms", title: "Data structures and algorithms", name: "Algorithmist" },
  { slug: "interview-prep", title: "Interview prep", name: "Interview ready" },
];

const languages = Object.keys(LANGUAGES) as Language[];
// Initiate is everyone's from the start, so it has no badge.
const titleBands = TITLES.slice(1);
// Likewise Newbie, the lowest rating tier.
const ratingTiers = TIERS.slice(1);

export const BADGES: Badge[] = [
  { id: "first-solve", group: "milestones", name: "First solve", description: "Solve your first problem." },
  ...SOLVE_MILESTONES.map((n) => ({
    id: `solves-${n}`,
    group: "milestones" as const,
    name: `${n} solves`,
    description: `Solve ${n} different problems.`,
  })),
  { id: "first-hard", group: "difficulty", name: "First hard", description: "Solve a hard problem." },
  ...languages.map((language) => ({
    id: `language-${language}`,
    group: "languages" as const,
    name: `${LANGUAGES[language].label} ${LANGUAGE_SOLVES}`,
    description: `Solve ${LANGUAGE_SOLVES} problems in ${LANGUAGES[language].label}.`,
  })),
  {
    id: "polyglot",
    group: "languages",
    name: "Polyglot",
    description: `Solve problems in ${POLYGLOT_LANGUAGES} different languages.`,
  },
  ...titleBands.map((band) => ({
    id: `title-${band.title.toLowerCase()}`,
    group: "levels" as const,
    name: band.title,
    description: `Reach level ${band.from}.`,
  })),
  { id: "first-ranked-win", group: "1v1", name: "First win", description: "Win a ranked 1v1 match." },
  {
    id: "comeback-win",
    group: "1v1",
    name: "Comeback",
    description: "Win a ranked 1v1 match after your opponent had passed more tests than you.",
  },
  ...ratingTiers.map((band) => ({
    id: `tier-${band.tier.toLowerCase()}`,
    group: "1v1" as const,
    name: band.tier,
    description: `Reach a 1v1 rating of ${band.from} once your rating is no longer provisional.`,
  })),
  // Granted in lib/territory.ts (decisions §16).
  {
    id: "core-holder",
    group: "territory",
    name: "Core holder",
    description: "Hold the Core at the end of a ranked Territory game.",
  },
  // Granted in lib/daily.ts and weekly.ts (decisions §15).
  ...STREAK_BADGES.map((days) => ({
    id: `streak-${days}`,
    group: "challenges" as const,
    name: `${days}-day streak`,
    description: `Solve the daily challenge ${days} days in a row.`,
  })),
  {
    id: "weekly-top-10",
    group: "challenges",
    name: "Weekly top 10%",
    description: "Finish a weekly challenge in the top 10%.",
  },
  // Granted in lib/learn.ts (decisions §17).
  { id: "first-lesson", group: "learn", name: "First lesson", description: "Finish your first lesson or tutorial." },
  ...ROADMAP_BADGES.map((roadmap) => ({
    id: `roadmap-${roadmap.slug}`,
    group: "learn" as const,
    name: roadmap.name,
    description: `Finish every module of the ${roadmap.title} roadmap.`,
  })),
];

/** Grants a badge once; returns whether it was new. */
export async function grantBadge(ctx: MutationCtx, userId: Id<"users">, badgeId: string) {
  const held = await ctx.db
    .query("userBadges")
    .withIndex("by_user_badge", (q) => q.eq("userId", userId).eq("badgeId", badgeId))
    .unique();
  if (held) return false;

  await ctx.db.insert("userBadges", { userId, badgeId });
  const count = await ctx.db
    .query("badgeCounts")
    .withIndex("by_badge", (q) => q.eq("badgeId", badgeId))
    .unique();
  if (count) await ctx.db.patch(count._id, { holders: count.holders + 1 });
  else await ctx.db.insert("badgeCounts", { badgeId, holders: 1 });
  return true;
}

async function grantAll(ctx: MutationCtx, userId: Id<"users">, badgeIds: string[]) {
  const earned: string[] = [];
  for (const id of badgeIds) if (await grantBadge(ctx, userId, id)) earned.push(id);
  return earned;
}

/** Title-band badges up to the level `xp` reaches. Returns the new ones. */
export async function checkLevelBadges(ctx: MutationCtx, userId: Id<"users">, xp: number) {
  const level = levelForXp(xp);
  const reached = titleBands.filter((band) => level >= band.from);
  return await grantAll(ctx, userId, reached.map((band) => `title-${band.title.toLowerCase()}`));
}

/**
 * Solve badges, counted from the user's solve entries in the ledger
 * ("solve:<slug>:<language>"). Called on every accepted Submit, so a badge
 * whose rule changes is caught up on the user's next solve. Returns the new ones.
 */
export async function checkSolveBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
  solved: { difficulty: "easy" | "medium" | "hard" },
) {
  const entries = await ctx.db
    .query("xpLedger")
    // ";" sorts right after ":", so this is every key starting "solve:".
    .withIndex("by_user_key", (q) => q.eq("userId", userId).gte("key", "solve:").lt("key", "solve;"))
    .collect();

  const problems = new Set<string>();
  const perLanguage = new Map<string, number>();
  for (const { key } of entries) {
    const [, slug, language] = key.split(":");
    problems.add(slug);
    perLanguage.set(language, (perLanguage.get(language) ?? 0) + 1);
  }

  const due: string[] = [];
  if (problems.size >= 1) due.push("first-solve");
  for (const n of SOLVE_MILESTONES) if (problems.size >= n) due.push(`solves-${n}`);
  if (solved.difficulty === "hard") due.push("first-hard");
  for (const [language, count] of perLanguage) {
    if (count >= LANGUAGE_SOLVES) due.push(`language-${language}`);
  }
  if (perLanguage.size >= POLYGLOT_LANGUAGES) due.push("polyglot");
  return await grantAll(ctx, userId, due);
}

/**
 * Badges from one finished 1v1 match. A win counts when the match was ranked,
 * whether or not it changed ratings; tier badges need a rating that is no
 * longer provisional. Returns the new ones.
 */
export async function checkMatchBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
  game: { rankedWin: boolean; comeback: boolean; rating?: { rating: number; games: number } },
) {
  const due: string[] = [];
  if (game.rankedWin) due.push("first-ranked-win");
  if (game.rankedWin && game.comeback) due.push("comeback-win");
  if (game.rating && game.rating.games >= PROVISIONAL_GAMES) {
    const reached = tierFor(game.rating.rating);
    const upTo = ratingTiers.findIndex((band) => band.tier === reached);
    for (const band of ratingTiers.slice(0, upTo + 1)) due.push(`tier-${band.tier.toLowerCase()}`);
  }
  return await grantAll(ctx, userId, due);
}

/** Badges from one finished Territory game. Returns the new ones. */
export async function checkTerritoryBadges(ctx: MutationCtx, userId: Id<"users">, game: { heldCore: boolean }) {
  return await grantAll(ctx, userId, game.heldCore ? ["core-holder"] : []);
}
