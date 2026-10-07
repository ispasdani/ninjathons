import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Global and Country leaderboard snapshots (plan, Leaderboards: technical).
crons.interval("rebuild leaderboards", { minutes: 5 }, internal.leaderboards.rebuildAll, {});

// Groups deleted more than 30 days ago (decisions §4).
crons.daily("purge deleted groups", { hourUTC: 3, minuteUTC: 0 }, internal.groups.purgeDeleted, {});

export default crons;
