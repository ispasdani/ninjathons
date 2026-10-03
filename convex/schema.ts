import { defineSchema } from "convex/server";

import { problems, problemTests } from "./schemas/problems";
import { xpLedger } from "./schemas/progression";
import { submissions } from "./schemas/submissions";
import { entitlements, users } from "./schemas/users";

// Table definitions live in convex/schemas, grouped by area.
export default defineSchema({
  users,
  entitlements,
  problems,
  problemTests,
  submissions,
  xpLedger,
});
