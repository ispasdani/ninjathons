import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Global and Country leaderboard snapshots (plan, Leaderboards: technical).
crons.interval("rebuild leaderboards", { minutes: 5 }, internal.leaderboards.rebuildAll, {});

// Groups deleted more than 30 days ago (decisions §4).
crons.daily("purge deleted groups", { hourUTC: 3, minuteUTC: 0 }, internal.groups.purgeDeleted, {});

// The daily challenge: picked on the hour, so a missed run is caught up; then
// yesterday's missed streaks settled (decisions §15).
crons.hourly("pick daily challenge", { minuteUTC: 0 }, internal.daily.pick, {});
crons.daily("settle streaks", { hourUTC: 0, minuteUTC: 5 }, internal.daily.settleStreaks, {});

// The weekly challenge: on Mondays the next set starts and last week is
// settled; hourly, so a missed run is caught up the same day.
crons.hourly("start weekly challenge", { minuteUTC: 0 }, internal.weekly.start, {});

// The Pro prices shown on /pro, copied from Stripe (decisions §18).
crons.hourly("sync Pro prices", { minuteUTC: 30 }, internal.billing.syncPrices, {});

export default crons;
