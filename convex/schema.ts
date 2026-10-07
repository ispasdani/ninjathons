import { defineSchema } from "convex/server";

import { problems, problemTests } from "./schemas/problems";
import { groupMembers, groups } from "./schemas/groups";
import { leaderboardSnapshots, leaderboardVersions } from "./schemas/leaderboards";
import { matchEvents, matches, matchmaking, matchPlayers, matchQueue } from "./schemas/matches";
import { badgeCounts, userBadges, xpLedger, xpMonths } from "./schemas/progression";
import { ratingHistory, ratings } from "./schemas/ratings";
import { submissions } from "./schemas/submissions";
import { entitlements, usernameReservations, users } from "./schemas/users";

// Table definitions live in convex/schemas, grouped by area.
export default defineSchema({
  users,
  usernameReservations,
  entitlements,
  problems,
  problemTests,
  submissions,
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
});
