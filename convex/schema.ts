import { defineSchema } from "convex/server";

import { problems, problemTests } from "./schemas/problems";
import { badgeCounts, userBadges, xpLedger } from "./schemas/progression";
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
  userBadges,
  badgeCounts,
  ratings,
  ratingHistory,
});
