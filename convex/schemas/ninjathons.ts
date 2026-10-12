import { defineTable } from "convex/server";
import { v } from "convex/values";

// Team projects with a brief, a deadline and judges (roadmap, Challenges and
// ninjathons; decisions §19). Only admins create them in V1.

export const criterion = v.object({
  name: v.string(),
  description: v.string(),
  // The weights of an event's criteria add up to 100.
  weight: v.number(),
});

// One row per event. While published, its stage (upcoming, running, judging)
// comes from the clock; see stageOf in lib/ninjathons.ts. Cancelling is the
// soft delete (decisions §4).
export const ninjathons = defineTable({
  // Fixed once published: it's the page's URL.
  slug: v.string(),
  title: v.string(),
  teaser: v.string(),
  // Markdown, sent to players only from startsAt.
  brief: v.string(),
  startsAt: v.number(),
  endsAt: v.number(),
  minTeam: v.number(),
  maxTeam: v.number(),
  rubric: v.array(criterion),
  // Plain text per place, first place first.
  prizes: v.array(v.string()),
  status: v.union(v.literal("draft"), v.literal("published"), v.literal("results"), v.literal("cancelled")),
  // Absent once the admin's account is deleted.
  createdBy: v.optional(v.id("users")),
  resultsAt: v.optional(v.number()),
})
  .index("by_slug", ["slug"])
  .index("by_status_start", ["status", "startsAt"]);

// A team in one event. Changes close at the event's start.
export const ninjathonTeams = defineTable({
  eventId: v.id("ninjathons"),
  name: v.string(),
  // Lowercased, for uniqueness within the event.
  nameKey: v.string(),
  captainId: v.id("users"),
  // Upper case, from lib/codes.ts, as groups use.
  inviteCode: v.string(),
  memberCount: v.number(),
})
  .index("by_event_name", ["eventId", "nameKey"])
  .index("by_inviteCode", ["inviteCode"]);

// One row per player per event: a player is on at most one team per event.
export const ninjathonMembers = defineTable({
  eventId: v.id("ninjathons"),
  teamId: v.id("ninjathonTeams"),
  userId: v.id("users"),
})
  .index("by_event_user", ["eventId", "userId"])
  .index("by_team", ["teamId"])
  .index("by_user", ["userId"]);

// A team's project, one per team, editable by any member until the end.
// Only the latest version is kept.
export const ninjathonSubmissions = defineTable({
  eventId: v.id("ninjathons"),
  teamId: v.id("ninjathonTeams"),
  projectName: v.string(),
  repoUrl: v.string(),
  demoUrl: v.string(),
  description: v.string(),
  savedAt: v.number(),
  // Absent once that member's account is deleted.
  savedBy: v.optional(v.id("users")),
  // Set by an admin; the reason is shown only to admins.
  disqualified: v.optional(v.object({ reason: v.string(), at: v.number() })),
})
  .index("by_event", ["eventId"])
  .index("by_team", ["teamId"]);

// One admin's score sheet for one submission: 0 to 10 per criterion, in
// rubric order, and a note only admins see.
export const ninjathonScores = defineTable({
  eventId: v.id("ninjathons"),
  submissionId: v.id("ninjathonSubmissions"),
  // Absent once the admin's account is deleted; the sheet still counts.
  judgeId: v.optional(v.id("users")),
  scores: v.array(v.number()),
  note: v.string(),
})
  .index("by_submission", ["submissionId"])
  .index("by_judge", ["judgeId"]);

// Written once, when results are published. Every team that submitted gets a
// row, except disqualified ones, which get no place.
export const ninjathonResults = defineTable({
  eventId: v.id("ninjathons"),
  // Absent when the team was deleted with its last member's account.
  teamId: v.optional(v.id("ninjathonTeams")),
  submissionId: v.optional(v.id("ninjathonSubmissions")),
  teamName: v.string(),
  place: v.number(),
  // 0 to 100, and the average per criterion (0 to 10), in rubric order.
  score: v.number(),
  criteria: v.array(v.number()),
})
  .index("by_event_place", ["eventId", "place"])
  .index("by_team", ["teamId"]);

// Each player's placings, for the Ninjathons board (the Hall of fame):
// 1st places, then 2nd, then 3rd, then events submitted, then whoever got
// there first (`tieBreak` is minus the time it last changed).
export const ninjathonStandings = defineTable({
  userId: v.id("users"),
  firsts: v.number(),
  seconds: v.number(),
  thirds: v.number(),
  events: v.number(),
  tieBreak: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_board", ["firsts", "seconds", "thirds", "events", "tieBreak"]);
