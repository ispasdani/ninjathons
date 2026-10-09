/**
 * Profile rules (decisions §18): the free fields' checks, which themes a
 * player has unlocked, which problems can't be pinned right now, and what a
 * profile shows, which depends on Pro.
 */
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { dayKey } from "./days";
import { hasPro } from "./functions";
import { unfinishedWeeklyProblems } from "./problems";
import { accentFits, BANNERS, DEFAULT_THEME, FONTS, SECTIONS, THEMES, themeById, type Theme } from "./themes";

export const BIO_MAX = 160;
export const LINKS_MAX = 4;
export const LINK_LENGTH_MAX = 200;
export const LANGUAGES_MAX = 3;
export const PINS_MAX = 3;

export async function profileRow(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** Plain text: control characters other than new lines go, runs of blank lines shrink to one. */
export function cleanBio(bio: string) {
  const clean = bio
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length > BIO_MAX) throw new ConvexError("BIO_TOO_LONG");
  return clean;
}

/** An https link with a real host and no credentials, as the URL parser writes it. */
export function cleanLink(link: string) {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    throw new ConvexError("BAD_LINK");
  }
  if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) {
    throw new ConvexError("BAD_LINK");
  }
  if (url.href.length > LINK_LENGTH_MAX) throw new ConvexError("BAD_LINK");
  return url.href;
}

/** Free themes, earned themes whose badge the player holds, and with Pro every theme. */
export async function unlockedThemes(ctx: QueryCtx, userId: Id<"users">, pro: boolean) {
  const badges = new Set(
    (
      await ctx.db
        .query("userBadges")
        .withIndex("by_user_badge", (q) => q.eq("userId", userId))
        .collect()
    ).map((b) => b.badgeId),
  );
  return THEMES.filter((t) => t.kind === "free" || pro || (t.kind === "earned" && badges.has(t.badge!))).map((t) => t.id);
}

/** Today's daily and every weekly set's problem until its week is over: their code stays off profiles. */
export async function heldProblems(ctx: QueryCtx, now: number) {
  const held = await unfinishedWeeklyProblems(ctx, now);
  const today = await ctx.db
    .query("dailyChallenges")
    .withIndex("by_day", (q) => q.eq("day", dayKey(now)))
    .unique();
  if (today) held.add(today.problemId);
  return held;
}

export type Look = {
  theme: string;
  accent: string | null;
  banner: string;
  headingFont: string;
  sections: { order: string[]; hidden: string[] };
};

export const DEFAULT_SECTIONS = { order: [...SECTIONS] as string[], hidden: [] as string[] };

/** Every known section once, in the saved order, new ones at the end. */
export function normalizeSections(saved: { order: string[]; hidden: string[] } | undefined) {
  if (!saved) return DEFAULT_SECTIONS;
  const known = new Set<string>(SECTIONS);
  const order = [...new Set(saved.order.filter((s) => known.has(s)))];
  for (const s of SECTIONS) if (!order.includes(s)) order.push(s);
  return { order, hidden: [...new Set(saved.hidden.filter((s) => known.has(s)))] };
}

function freeLook(theme: string): Look {
  return { theme, accent: null, banner: "none", headingFont: "geist", sections: DEFAULT_SECTIONS };
}

/**
 * What the profile shows. Pro values (Pro themes, accent, banner, font,
 * sections) only while the player is Pro; otherwise the theme falls back to
 * their last free or earned one, or Default, and the values are kept.
 */
export async function lookFor(ctx: QueryCtx, user: Doc<"users">, row: Doc<"profiles"> | null): Promise<Look> {
  if (!row) return freeLook(DEFAULT_THEME);
  const pro = await hasPro(ctx, user);
  const unlocked = new Set(await unlockedThemes(ctx, user._id, pro));
  const pick = (id: string | undefined) => (id && unlocked.has(id) ? id : null);
  const theme = pick(row.theme) ?? pick(row.freeTheme) ?? DEFAULT_THEME;
  if (!pro) return freeLook(theme);
  const t: Theme = themeById(theme);
  return {
    theme,
    // An accent saved for another theme is dropped if it doesn't read on this one.
    accent: row.accent && accentFits(t, row.accent) ? row.accent : null,
    banner: row.banner && (BANNERS as readonly string[]).includes(row.banner) ? row.banner : "none",
    headingFont: row.headingFont && FONTS.some((f) => f.id === row.headingFont) ? row.headingFont : "geist",
    sections: normalizeSections(row.sections),
  };
}
