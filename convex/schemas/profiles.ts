import { defineTable } from "convex/server";
import { v } from "convex/values";

import { language } from "./problems";

// The profile's activity grid (decisions §18): accepted Submits and finished
// lessons per player per UTC day ("2026-10-09"). Kept by noteActivity in
// lib/activity.ts, so the profile never reads submissions.
export const activityDays = defineTable({
  userId: v.id("users"),
  day: v.string(),
  count: v.number(),
}).index("by_user_day", ["userId", "day"]);

// What a player chose for their profile (decisions §18). No row means the
// defaults. Theme values are ids from lib/themes.ts, never CSS.
export const profiles = defineTable({
  userId: v.id("users"),
  // Plain text, up to 160 characters.
  bio: v.optional(v.string()),
  // Up to 4 https links.
  links: v.optional(v.array(v.string())),
  // Up to 3 favourite languages.
  languages: v.optional(v.array(language)),
  // Up to 3 accepted Submits, one per problem; pinning makes their code public.
  pins: v.optional(v.array(v.object({ problemId: v.id("problems"), submissionId: v.id("submissions") }))),
  // The theme chosen, and the last free or earned one, shown when Pro ends.
  theme: v.optional(v.string()),
  freeTheme: v.optional(v.string()),
  // Pro options, kept when Pro ends but shown only while Pro.
  accent: v.optional(v.string()),
  banner: v.optional(v.string()),
  headingFont: v.optional(v.string()),
  sections: v.optional(v.object({ order: v.array(v.string()), hidden: v.array(v.string()) })),
}).index("by_user", ["userId"]);
