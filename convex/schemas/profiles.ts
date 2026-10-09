import { defineTable } from "convex/server";
import { v } from "convex/values";

// The profile's activity grid (decisions §18): accepted Submits and finished
// lessons per player per UTC day ("2026-10-09"). Kept by noteActivity in
// lib/activity.ts, so the profile never reads submissions.
export const activityDays = defineTable({
  userId: v.id("users"),
  day: v.string(),
  count: v.number(),
}).index("by_user_day", ["userId", "day"]);
