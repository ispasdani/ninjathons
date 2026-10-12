/**
 * Ninjathons for players (decisions §19): the event list and pages, teams
 * and submissions. Admin functions are in ninjathonsAdmin.ts.
 */
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUserOrNull, publicQuery, userMutation } from "./lib/functions";
import {
  cleanSubmission,
  cleanTeamName,
  leaveTeam as leave,
  memberOf,
  newTeamCode,
  normalizeTeamCode,
  stageOf,
  teamMembers,
} from "./lib/ninjathons";

async function liveEvent(ctx: QueryCtx, eventId: Id<"ninjathons">) {
  const event = await ctx.db.get(eventId);
  if (!event || event.status === "draft" || event.status === "cancelled") throw new ConvexError("EVENT_NOT_FOUND");
  return event;
}

/** Teams form and change only before the start. */
function requireUpcoming(event: Doc<"ninjathons">) {
  if (stageOf(event, Date.now()) !== "upcoming") throw new ConvexError("REGISTRATION_CLOSED");
}

/** The caller's team in its event, or TEAM_NOT_FOUND. */
async function myTeam(ctx: QueryCtx, teamId: Id<"ninjathonTeams">, userId: Id<"users">) {
  const team = await ctx.db.get(teamId);
  const row = team && (await memberOf(ctx, team.eventId, userId));
  if (!team || !row || row.teamId !== teamId) throw new ConvexError("TEAM_NOT_FOUND");
  return team;
}

async function captainOf(ctx: QueryCtx, teamId: Id<"ninjathonTeams">, userId: Id<"users">) {
  const team = await myTeam(ctx, teamId, userId);
  if (team.captainId !== userId) throw new ConvexError("NOT_CAPTAIN");
  return team;
}

async function people(ctx: QueryCtx, team: Doc<"ninjathonTeams">) {
  return await Promise.all(
    (await teamMembers(ctx, team._id)).map(async (m) => {
      const user = await ctx.db.get(m.userId);
      return {
        userId: m.userId,
        username: user?.username ?? null,
        name: user?.name ?? "Deleted player",
        imageUrl: user?.imageUrl ?? "",
        isCaptain: m.userId === team.captainId,
      };
    }),
  );
}

function project(s: Doc<"ninjathonSubmissions">) {
  return {
    projectName: s.projectName,
    repoUrl: s.repoUrl,
    demoUrl: s.demoUrl,
    description: s.description,
    savedAt: s.savedAt,
  };
}

async function teamCount(ctx: QueryCtx, eventId: Id<"ninjathons">) {
  return (
    await ctx.db
      .query("ninjathonTeams")
      .withIndex("by_event_name", (q) => q.eq("eventId", eventId))
      .collect()
  ).length;
}

/** What anyone may see of an event before its brief. */
function overview(event: Doc<"ninjathons">, now: number) {
  return {
    _id: event._id,
    slug: event.slug,
    title: event.title,
    teaser: event.teaser,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    minTeam: event.minTeam,
    maxTeam: event.maxTeam,
    prizes: event.prizes,
    stage: stageOf(event, now),
  };
}

/** Published events, running first, then upcoming (soonest first), then past (newest first). */
export const list = publicQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = [
      ...(await ctx.db.query("ninjathons").withIndex("by_status_start", (q) => q.eq("status", "published")).collect()),
      ...(await ctx.db.query("ninjathons").withIndex("by_status_start", (q) => q.eq("status", "results")).collect()),
    ];
    const events = await Promise.all(
      rows.map(async (e) => ({ ...overview(e, now), teams: await teamCount(ctx, e._id) })),
    );
    return {
      running: events.filter((e) => e.stage === "running"),
      upcoming: events.filter((e) => e.stage === "upcoming").sort((a, b) => a.startsAt - b.startsAt),
      past: events.filter((e) => e.stage === "judging" || e.stage === "results").sort((a, b) => b.endsAt - a.endsAt),
    };
  },
});

/**
 * One event's page by slug: the overview, the brief from the start, the
 * caller's team and submission, and the results once they're out. Null for
 * an unknown slug or a draft. `at` changes when the page's clock crosses the
 * start or end, so the query runs again and the brief arrives on time; the
 * server still checks the time itself.
 */
export const get = publicQuery({
  args: { slug: v.string(), at: v.optional(v.string()) },
  handler: async (ctx, { slug }) => {
    const event = await ctx.db
      .query("ninjathons")
      .withIndex("by_slug", (q) => q.eq("slug", slug.toLowerCase()))
      .unique();
    if (!event || event.status === "draft") return null;
    const now = Date.now();
    if (event.status === "cancelled") return { ...overview(event, now), cancelled: true as const };

    const stage = stageOf(event, now);
    const user = await getCurrentUserOrNull(ctx);
    const row = user && (await memberOf(ctx, event._id, user._id));
    const team = row && (await ctx.db.get(row.teamId));
    let me = null;
    if (team) {
      const submission = await ctx.db
        .query("ninjathonSubmissions")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .unique();
      me = {
        teamId: team._id,
        name: team.name,
        isCaptain: team.captainId === user!._id,
        // Members may invite others while the team can still change.
        inviteCode: stage === "upcoming" ? team.inviteCode : null,
        members: await people(ctx, team),
        submission: submission ? project(submission) : null,
      };
    }

    let results = null;
    if (event.status === "results") {
      const rows = await ctx.db
        .query("ninjathonResults")
        .withIndex("by_event_place", (q) => q.eq("eventId", event._id))
        .collect();
      results = await Promise.all(
        rows.map(async (r) => {
          const team = r.teamId ? await ctx.db.get(r.teamId) : null;
          const submission = r.submissionId ? await ctx.db.get(r.submissionId) : null;
          return {
            place: r.place,
            teamName: r.teamName,
            score: r.score,
            criteria: r.criteria,
            members: team ? await people(ctx, team) : [],
            project: submission ? project(submission) : null,
          };
        }),
      );
    }

    return {
      ...overview(event, now),
      cancelled: false as const,
      rubric: event.rubric,
      teams: await teamCount(ctx, event._id),
      // The brief only from the start (decisions §19).
      brief: now >= event.startsAt ? event.brief : null,
      signedIn: user !== null,
      me,
      results,
    };
  },
});

async function nameTaken(ctx: QueryCtx, eventId: Id<"ninjathons">, name: string, except?: Id<"ninjathonTeams">) {
  const team = await ctx.db
    .query("ninjathonTeams")
    .withIndex("by_event_name", (q) => q.eq("eventId", eventId).eq("nameKey", name.toLowerCase()))
    .unique();
  return team !== null && team._id !== except;
}

async function requireFree(ctx: MutationCtx, eventId: Id<"ninjathons">, user: Doc<"users">) {
  if (!user.username) throw new ConvexError("USERNAME_REQUIRED");
  if (await memberOf(ctx, eventId, user._id)) throw new ConvexError("ALREADY_ON_TEAM");
}

export const createTeam = userMutation({
  args: { eventId: v.id("ninjathons"), name: v.string() },
  handler: async (ctx, { eventId, name }) => {
    const event = await liveEvent(ctx, eventId);
    requireUpcoming(event);
    await requireFree(ctx, eventId, ctx.user);
    const clean = cleanTeamName(name);
    if (await nameTaken(ctx, eventId, clean)) throw new ConvexError("TEAM_NAME_TAKEN");
    const teamId = await ctx.db.insert("ninjathonTeams", {
      eventId,
      name: clean,
      nameKey: clean.toLowerCase(),
      captainId: ctx.user._id,
      inviteCode: await newTeamCode(ctx),
      memberCount: 1,
    });
    await ctx.db.insert("ninjathonMembers", { eventId, teamId, userId: ctx.user._id });
    return teamId;
  },
});

/** Joins by invite code; joining the team you're already on just returns it. */
export const joinTeam = userMutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    const team = await ctx.db
      .query("ninjathonTeams")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalizeTeamCode(inviteCode)))
      .unique();
    if (!team) throw new ConvexError("TEAM_INVITE_NOT_FOUND");
    const event = await liveEvent(ctx, team.eventId);
    const row = await memberOf(ctx, event._id, ctx.user._id);
    if (row?.teamId === team._id) return team._id;
    requireUpcoming(event);
    await requireFree(ctx, event._id, ctx.user);
    if (team.memberCount >= event.maxTeam) throw new ConvexError("TEAM_FULL");
    await ctx.db.insert("ninjathonMembers", { eventId: event._id, teamId: team._id, userId: ctx.user._id });
    await ctx.db.patch(team._id, { memberCount: team.memberCount + 1 });
    return team._id;
  },
});

/** Leaving as captain hands the team to the member who joined first; an empty team goes. */
export const leaveTeam = userMutation({
  args: { teamId: v.id("ninjathonTeams") },
  handler: async (ctx, { teamId }) => {
    const team = await myTeam(ctx, teamId, ctx.user._id);
    requireUpcoming(await liveEvent(ctx, team.eventId));
    await leave(ctx, team, ctx.user._id);
  },
});

export const renameTeam = userMutation({
  args: { teamId: v.id("ninjathonTeams"), name: v.string() },
  handler: async (ctx, { teamId, name }) => {
    const team = await captainOf(ctx, teamId, ctx.user._id);
    requireUpcoming(await liveEvent(ctx, team.eventId));
    const clean = cleanTeamName(name);
    if (await nameTaken(ctx, team.eventId, clean, team._id)) throw new ConvexError("TEAM_NAME_TAKEN");
    await ctx.db.patch(teamId, { name: clean, nameKey: clean.toLowerCase() });
  },
});

/** The old code stops working at once. */
export const newInviteCode = userMutation({
  args: { teamId: v.id("ninjathonTeams") },
  handler: async (ctx, { teamId }) => {
    const team = await captainOf(ctx, teamId, ctx.user._id);
    requireUpcoming(await liveEvent(ctx, team.eventId));
    const inviteCode = await newTeamCode(ctx);
    await ctx.db.patch(teamId, { inviteCode });
    return inviteCode;
  },
});

export const removeMember = userMutation({
  args: { teamId: v.id("ninjathonTeams"), userId: v.id("users") },
  handler: async (ctx, { teamId, userId }) => {
    const team = await captainOf(ctx, teamId, ctx.user._id);
    requireUpcoming(await liveEvent(ctx, team.eventId));
    if (userId === ctx.user._id) throw new ConvexError("CAPTAIN_CANNOT_REMOVE_SELF");
    await leave(ctx, team, userId);
  },
});

/**
 * Saves the team's project, replacing the last version. Any member may save
 * while the event runs; the deadline is the server's clock.
 */
export const saveSubmission = userMutation({
  args: {
    teamId: v.id("ninjathonTeams"),
    projectName: v.string(),
    repoUrl: v.string(),
    demoUrl: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { teamId, ...fields }) => {
    const team = await myTeam(ctx, teamId, ctx.user._id);
    const event = await liveEvent(ctx, team.eventId);
    const now = Date.now();
    if (stageOf(event, now) !== "running") throw new ConvexError("SUBMISSIONS_CLOSED");
    if (team.memberCount < event.minTeam) throw new ConvexError("TEAM_TOO_SMALL");
    const clean = cleanSubmission(fields);
    const existing = await ctx.db
      .query("ninjathonSubmissions")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .unique();
    const values = { ...clean, savedAt: now, savedBy: ctx.user._id };
    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert("ninjathonSubmissions", { eventId: event._id, teamId, ...values });
  },
});
