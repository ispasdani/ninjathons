/**
 * Creating and judging ninjathons (decisions §19). Admins only: every
 * function here is built from adminQuery or adminMutation and has a denial
 * test in admin.test.ts.
 */
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { adminMutation, adminQuery } from "./lib/functions";
import { checkScores, cleanEvent, cleanText, publishResults as placeTeams, sheetTotal, stageOf, teamMembers } from "./lib/ninjathons";
import { criterion } from "./schemas/ninjathons";

const eventFields = {
  slug: v.string(),
  title: v.string(),
  teaser: v.string(),
  brief: v.string(),
  startsAt: v.number(),
  endsAt: v.number(),
  minTeam: v.number(),
  maxTeam: v.number(),
  rubric: v.array(criterion),
  prizes: v.array(v.string()),
};

async function getEvent(ctx: QueryCtx, eventId: Id<"ninjathons">) {
  const event = await ctx.db.get(eventId);
  if (!event) throw new ConvexError("EVENT_NOT_FOUND");
  return event;
}

async function slugTaken(ctx: QueryCtx, slug: string, except?: Id<"ninjathons">) {
  const event = await ctx.db
    .query("ninjathons")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  return event !== null && event._id !== except;
}

/** Judging opens once the event has ended, and closes when results are out. */
function requireJudging(event: Doc<"ninjathons">) {
  if (stageOf(event, Date.now()) !== "judging") throw new ConvexError("NOT_JUDGING");
}

/** Every event, drafts and cancelled ones included, newest start first. */
export const list = adminQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db.query("ninjathons").collect();
    return await Promise.all(
      events
        .sort((a, b) => b.startsAt - a.startsAt)
        .map(async (e) => ({
          _id: e._id,
          slug: e.slug,
          title: e.title,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          stage: stageOf(e, now),
          teams: (
            await ctx.db
              .query("ninjathonTeams")
              .withIndex("by_event_name", (q) => q.eq("eventId", e._id))
              .collect()
          ).length,
          submissions: (
            await ctx.db
              .query("ninjathonSubmissions")
              .withIndex("by_event", (q) => q.eq("eventId", e._id))
              .collect()
          ).length,
        })),
    );
  },
});

/** One event with every field, for the editor. Takes any string, since it comes from the URL. */
export const get = adminQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const eventId = ctx.db.normalizeId("ninjathons", args.eventId);
    const event = eventId && (await ctx.db.get(eventId));
    if (!event) return null;
    return { ...event, stage: stageOf(event, Date.now()) };
  },
});

export const create = adminMutation({
  args: eventFields,
  handler: async (ctx, args) => {
    const fields = cleanEvent(args);
    if (await slugTaken(ctx, fields.slug)) throw new ConvexError("EVENT_SLUG_TAKEN");
    return await ctx.db.insert("ninjathons", { ...fields, status: "draft", createdBy: ctx.user._id });
  },
});

/** Everything can change until the start; the slug only while it's a draft. */
export const update = adminMutation({
  args: { eventId: v.id("ninjathons"), ...eventFields },
  handler: async (ctx, { eventId, ...args }) => {
    const event = await getEvent(ctx, eventId);
    const stage = stageOf(event, Date.now());
    if (stage !== "draft" && stage !== "upcoming") throw new ConvexError("EVENT_LOCKED");
    const fields = cleanEvent(args);
    if (stage !== "draft" && fields.slug !== event.slug) throw new ConvexError("EVENT_SLUG_FIXED");
    if (await slugTaken(ctx, fields.slug, eventId)) throw new ConvexError("EVENT_SLUG_TAKEN");
    if (stage === "upcoming" && fields.startsAt <= Date.now()) throw new ConvexError("EVENT_STARTS_IN_PAST");
    // A smaller team limit can't strand teams already over it.
    if (stage === "upcoming") {
      const teams = await ctx.db
        .query("ninjathonTeams")
        .withIndex("by_event_name", (q) => q.eq("eventId", eventId))
        .collect();
      if (teams.some((t) => t.memberCount > fields.maxTeam)) throw new ConvexError("TEAMS_OVER_LIMIT");
    }
    await ctx.db.patch(eventId, fields);
  },
});

/** A draft goes public and opens registration. It must start in the future. */
export const publish = adminMutation({
  args: { eventId: v.id("ninjathons") },
  handler: async (ctx, { eventId }) => {
    const event = await getEvent(ctx, eventId);
    if (event.status !== "draft") throw new ConvexError("EVENT_NOT_DRAFT");
    if (event.startsAt <= Date.now()) throw new ConvexError("EVENT_STARTS_IN_PAST");
    await ctx.db.patch(eventId, { status: "published" });
  },
});

/** The soft delete (decisions §4). Not once results are out. */
export const cancel = adminMutation({
  args: { eventId: v.id("ninjathons") },
  handler: async (ctx, { eventId }) => {
    const event = await getEvent(ctx, eventId);
    if (event.status === "results") throw new ConvexError("EVENT_HAS_RESULTS");
    await ctx.db.patch(eventId, { status: "cancelled" });
  },
});

/**
 * The judging screen: every submission once the event has ended, its team,
 * the caller's own score sheet and how many sheets it has. Other judges'
 * scores stay hidden so each judge scores on their own.
 */
export const submissions = adminQuery({
  args: { eventId: v.id("ninjathons") },
  handler: async (ctx, { eventId }) => {
    const event = await getEvent(ctx, eventId);
    const stage = stageOf(event, Date.now());
    if (stage !== "judging" && stage !== "results") return [];
    const rows = await ctx.db
      .query("ninjathonSubmissions")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    return await Promise.all(
      rows
        .sort((a, b) => a.savedAt - b.savedAt)
        .map(async (s) => {
          const team = await ctx.db.get(s.teamId);
          const sheets = await ctx.db
            .query("ninjathonScores")
            .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
            .collect();
          const mine = sheets.find((x) => x.judgeId === ctx.user._id);
          const members = team ? await teamMembers(ctx, team._id) : [];
          return {
            _id: s._id,
            teamName: team?.name ?? "Deleted player",
            members: await Promise.all(
              members.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return { username: user?.username ?? null, name: user?.name ?? "Deleted player" };
              }),
            ),
            projectName: s.projectName,
            repoUrl: s.repoUrl,
            demoUrl: s.demoUrl,
            description: s.description,
            savedAt: s.savedAt,
            disqualified: s.disqualified ?? null,
            sheets: sheets.length,
            mine: mine ? { scores: mine.scores, note: mine.note, total: sheetTotal(mine.scores, event.rubric) } : null,
          };
        }),
    );
  },
});

/** Saves the caller's score sheet for a submission, replacing their last one. */
export const score = adminMutation({
  args: { submissionId: v.id("ninjathonSubmissions"), scores: v.array(v.number()), note: v.string() },
  handler: async (ctx, { submissionId, scores, note }) => {
    const submission = await ctx.db.get(submissionId);
    if (!submission) throw new ConvexError("SUBMISSION_NOT_FOUND");
    const event = await getEvent(ctx, submission.eventId);
    requireJudging(event);
    checkScores(scores, event.rubric);
    const values = { scores, note: cleanText(note, 1000, "NOTE_TOO_LONG") };
    const sheets = await ctx.db
      .query("ninjathonScores")
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .collect();
    const mine = sheets.find((x) => x.judgeId === ctx.user._id);
    if (mine) await ctx.db.patch(mine._id, values);
    else await ctx.db.insert("ninjathonScores", { eventId: event._id, submissionId, judgeId: ctx.user._id, ...values });
  },
});

/** Disqualifies a submission with a reason only admins see, or lifts it with `reason: null`. */
export const disqualify = adminMutation({
  args: { submissionId: v.id("ninjathonSubmissions"), reason: v.union(v.string(), v.null()) },
  handler: async (ctx, { submissionId, reason }) => {
    const submission = await ctx.db.get(submissionId);
    if (!submission) throw new ConvexError("SUBMISSION_NOT_FOUND");
    requireJudging(await getEvent(ctx, submission.eventId));
    if (reason === null) {
      await ctx.db.patch(submissionId, { disqualified: undefined });
      return;
    }
    const clean = cleanText(reason, 500, "BAD_REASON");
    if (clean.length === 0) throw new ConvexError("BAD_REASON");
    await ctx.db.patch(submissionId, { disqualified: { reason: clean, at: Date.now() } });
  },
});

/** Places the teams and gives the rewards. Can't be undone. */
export const publishResults = adminMutation({
  args: { eventId: v.id("ninjathons") },
  handler: async (ctx, { eventId }) => {
    const event = await getEvent(ctx, eventId);
    requireJudging(event);
    await placeTeams(ctx, event);
  },
});
