import { defineSchema } from "convex/server";

import {
  dailyChallenges,
  dailyResults,
  streaks,
  weeklyProgress,
  weeklyResults,
  weeklySets,
} from "./schemas/challenges";
import { problems, problemTests, testDrives } from "./schemas/problems";
import { docPages, docSets, docViews } from "./schemas/docs";
import { groupMembers, groups } from "./schemas/groups";
import { learningXp, lessonProgress, lessons, roadmapProgress, roadmaps } from "./schemas/learn";
import { leaderboardSnapshots, leaderboardVersions } from "./schemas/leaderboards";
import { challenges, matchEvents, matches, matchmaking, matchPlayers, matchQueue } from "./schemas/matches";
import { badgeCounts, userBadges, xpLedger, xpMonths } from "./schemas/progression";
import { ratingHistory, ratings } from "./schemas/ratings";
import { submissions, webSubmissions } from "./schemas/submissions";
import {
  territoryEvents,
  territoryGames,
  territoryLobbies,
  territoryLobbyPlayers,
  territoryMatchmaking,
  territoryPlayers,
  territoryQueue,
  territoryRegions,
} from "./schemas/territory";
import { stripeCustomers, stripeEvents } from "./schemas/billing";
import { entitlements, usernameReservations, users } from "./schemas/users";

// Table definitions live in convex/schemas, grouped by area.
export default defineSchema({
  users,
  usernameReservations,
  entitlements,
  stripeCustomers,
  stripeEvents,
  problems,
  problemTests,
  testDrives,
  submissions,
  webSubmissions,
  xpLedger,
  xpMonths,
  userBadges,
  badgeCounts,
  ratings,
  ratingHistory,
  leaderboardSnapshots,
  leaderboardVersions,
  groups,
  groupMembers,
  matches,
  matchPlayers,
  matchEvents,
  matchQueue,
  matchmaking,
  challenges,
  dailyChallenges,
  dailyResults,
  streaks,
  weeklySets,
  weeklyProgress,
  weeklyResults,
  territoryGames,
  territoryPlayers,
  territoryRegions,
  territoryEvents,
  territoryLobbies,
  territoryLobbyPlayers,
  territoryQueue,
  territoryMatchmaking,
  lessons,
  roadmaps,
  lessonProgress,
  roadmapProgress,
  learningXp,
  docPages,
  docSets,
  docViews,
});
