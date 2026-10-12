/**
 * Ninjathon rules shared by ninjathons.ts, ninjathonsAdmin.ts and account
 * deletion (decisions §19).
 */
import { ConvexError, type Infer } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { criterion } from "../schemas/ninjathons";
import { grantBadge } from "./badges";
import { normalizeCode, randomCode } from "./codes";
import { cleanLink } from "./profiles";
import { awardXp } from "./xp";

const HOUR = 60 * 60 * 1000;
export const MIN_LENGTH_MS = HOUR;
export const MAX_LENGTH_MS = 7 * 24 * HOUR;
export const MAX_TEAM = 6;
export const MIN_CRITERIA = 2;
export const MAX_CRITERIA = 6;
export const MAX_PRIZES = 10;
export const MAX_SCORE = 10;
export const DESCRIPTION_MAX = 1000;
export const BRIEF_MAX = 20_000;
// XP once per event (roadmap, XP sources): for submitting, plus the place.
export const SUBMIT_XP = 200;
export const PLACE_XP = [1000, 750, 500];

export type Criterion = Infer<typeof criterion>;
export type EventFields = {
  slug: string;
  title: string;
  teaser: string;
  brief: string;
  startsAt: number;
  endsAt: number;
  minTeam: number;
  maxTeam: number;
  rubric: Criterion[];
  prizes: string[];
};

export type Stage = "draft" | "upcoming" | "running" | "judging" | "results" | "cancelled";

/** Where an event stands at `now`: published events move through their stages by the clock. */
export function stageOf(event: Pick<Doc<"ninjathons">, "status" | "startsAt" | "endsAt">, now: number): Stage {
  if (event.status !== "published") return event.status;
  if (now < event.startsAt) return "upcoming";
  if (now < event.endsAt) return "running";
  return "judging";
}

/** Single-line text: whitespace runs shrink to one space. */
function line(text: string, min: number, max: number, code: string) {
  const clean = text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ");
  if (clean.length < min || clean.length > max) throw new ConvexError(code);
  return clean;
}

/** Plain text over several lines: control characters other than new lines go, blank-line runs shrink. */
export function cleanText(text: string, max: number, code: string) {
  const clean = text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length > max) throw new ConvexError(code);
  return clean;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Checks and tidies an event's fields; throws BAD_EVENT_* codes. */
export function cleanEvent(fields: EventFields): EventFields {
  const slug = fields.slug.trim().toLowerCase();
  if (!SLUG.test(slug) || slug.length < 3 || slug.length > 60) throw new ConvexError("BAD_EVENT_SLUG");
  const length = fields.endsAt - fields.startsAt;
  if (!Number.isFinite(length) || length < MIN_LENGTH_MS || length > MAX_LENGTH_MS) {
    throw new ConvexError("BAD_EVENT_LENGTH");
  }
  const { minTeam, maxTeam } = fields;
  if (!Number.isInteger(minTeam) || !Number.isInteger(maxTeam) || minTeam < 1 || maxTeam > MAX_TEAM || minTeam > maxTeam) {
    throw new ConvexError("BAD_TEAM_SIZE");
  }
  if (fields.rubric.length < MIN_CRITERIA || fields.rubric.length > MAX_CRITERIA) throw new ConvexError("BAD_RUBRIC");
  const rubric = fields.rubric.map((c) => {
    if (!Number.isInteger(c.weight) || c.weight < 1) throw new ConvexError("BAD_RUBRIC");
    return {
      name: line(c.name, 1, 40, "BAD_RUBRIC"),
      description: line(c.description, 0, 200, "BAD_RUBRIC"),
      weight: c.weight,
    };
  });
  if (rubric.reduce((sum, c) => sum + c.weight, 0) !== 100) throw new ConvexError("BAD_RUBRIC");
  if (fields.prizes.length > MAX_PRIZES) throw new ConvexError("BAD_PRIZES");
  const prizes = fields.prizes.map((p) => line(p, 1, 200, "BAD_PRIZES"));
  return {
    slug,
    title: line(fields.title, 3, 80, "BAD_EVENT_TITLE"),
    teaser: line(fields.teaser, 0, 160, "BAD_EVENT_TEASER"),
    brief: cleanText(fields.brief, BRIEF_MAX, "BAD_EVENT_BRIEF"),
    startsAt: fields.startsAt,
    endsAt: fields.endsAt,
    minTeam,
    maxTeam,
    rubric,
    prizes,
  };
}

export function cleanTeamName(name: string) {
  return line(name, 3, 32, "BAD_TEAM_NAME");
}

export function cleanSubmission(fields: { projectName: string; repoUrl: string; demoUrl: string; description: string }) {
  return {
    projectName: line(fields.projectName, 1, 60, "BAD_PROJECT_NAME"),
    repoUrl: cleanLink(fields.repoUrl),
    demoUrl: cleanLink(fields.demoUrl),
    description: cleanText(fields.description, DESCRIPTION_MAX, "DESCRIPTION_TOO_LONG"),
  };
}

/** A score sheet: one whole number from 0 to 10 per criterion. */
export function checkScores(scores: number[], rubric: Criterion[]) {
  if (scores.length !== rubric.length || scores.some((s) => !Number.isInteger(s) || s < 0 || s > MAX_SCORE)) {
    throw new ConvexError("BAD_SCORES");
  }
}

/** One sheet's total: Σ(weight × score) ÷ 10, from 0 to 100. */
export function sheetTotal(scores: number[], rubric: Criterion[]) {
  return rubric.reduce((sum, c, i) => sum + c.weight * scores[i], 0) / MAX_SCORE;
}

export type Scored = {
  submissionId: Id<"ninjathonSubmissions">;
  savedAt: number;
  sheets: number[][];
};

/**
 * Ranks submissions by the average of their judges' totals. Ties go to the
 * higher average on the heaviest criterion (the first of equal weight), then
 * to the earlier final save.
 */
export function rank(rubric: Criterion[], entries: Scored[]) {
  const heaviest = rubric.reduce((best, c, i) => (c.weight > rubric[best].weight ? i : best), 0);
  const scored = entries.map((e) => {
    const criteria = rubric.map((_, i) => e.sheets.reduce((sum, s) => sum + s[i], 0) / e.sheets.length);
    const score = e.sheets.reduce((sum, s) => sum + sheetTotal(s, rubric), 0) / e.sheets.length;
    return { ...e, score, criteria };
  });
  scored.sort(
    (a, b) => b.score - a.score || b.criteria[heaviest] - a.criteria[heaviest] || a.savedAt - b.savedAt,
  );
  return scored.map((e, i) => ({ ...e, place: i + 1 }));
}

// --- Teams ---

export async function newTeamCode(ctx: QueryCtx) {
  for (;;) {
    const code = randomCode();
    const taken = await ctx.db
      .query("ninjathonTeams")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!taken) return code;
  }
}

export const normalizeTeamCode = normalizeCode;

export async function memberOf(ctx: QueryCtx, eventId: Id<"ninjathons">, userId: Id<"users">) {
  return await ctx.db
    .query("ninjathonMembers")
    .withIndex("by_event_user", (q) => q.eq("eventId", eventId).eq("userId", userId))
    .unique();
}

export async function teamMembers(ctx: QueryCtx, teamId: Id<"ninjathonTeams">) {
  const rows = await ctx.db
    .query("ninjathonMembers")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .collect();
  return rows.sort((a, b) => a._creationTime - b._creationTime);
}

/**
 * Takes a player off a team. When the captain goes, the member who joined
 * first becomes captain. A team left empty is deleted with its submission
 * and score sheets, unless results already name it.
 */
export async function leaveTeam(ctx: MutationCtx, team: Doc<"ninjathonTeams">, userId: Id<"users">) {
  const row = await memberOf(ctx, team.eventId, userId);
  if (!row || row.teamId !== team._id) return;
  await ctx.db.delete(row._id);

  const rest = await teamMembers(ctx, team._id);
  if (rest.length > 0) {
    await ctx.db.patch(team._id, {
      memberCount: rest.length,
      ...(team.captainId === userId ? { captainId: rest[0].userId } : {}),
    });
    return;
  }
  const submission = await ctx.db
    .query("ninjathonSubmissions")
    .withIndex("by_team", (q) => q.eq("teamId", team._id))
    .unique();
  if (submission) {
    const sheets = await ctx.db
      .query("ninjathonScores")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .collect();
    for (const sheet of sheets) await ctx.db.delete(sheet._id);
    await ctx.db.delete(submission._id);
  }
  // A placing stays, anonymized (decisions §4).
  const result = await ctx.db
    .query("ninjathonResults")
    .withIndex("by_team", (q) => q.eq("teamId", team._id))
    .unique();
  if (result) await ctx.db.patch(result._id, { teamId: undefined, submissionId: undefined, teamName: "Deleted player" });
  await ctx.db.delete(team._id);
}

/** Account deletion: off every team, out of the score sheets and events they wrote, and off the board. */
export async function removeFromNinjathons(ctx: MutationCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("ninjathonMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const m of memberships) {
    const team = await ctx.db.get(m.teamId);
    if (team) await leaveTeam(ctx, team, userId);
    else await ctx.db.delete(m._id);
  }
  const sheets = await ctx.db
    .query("ninjathonScores")
    .withIndex("by_judge", (q) => q.eq("judgeId", userId))
    .collect();
  for (const sheet of sheets) await ctx.db.patch(sheet._id, { judgeId: undefined });
  // Events they created are kept, without the author. Admins are few, so a scan is fine.
  for (const event of await ctx.db.query("ninjathons").collect()) {
    if (event.createdBy === userId) await ctx.db.patch(event._id, { createdBy: undefined });
  }
  for (const submission of await ctx.db.query("ninjathonSubmissions").collect()) {
    if (submission.savedBy === userId) await ctx.db.patch(submission._id, { savedBy: undefined });
  }
  const standing = await ctx.db
    .query("ninjathonStandings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (standing) await ctx.db.delete(standing._id);
}

// --- Results ---

/**
 * Publishing results: ranks the submissions that aren't disqualified, writes
 * the placements, and gives each member of a placed team their XP, badges
 * and standing. Every one of those submissions needs a score sheet.
 */
export async function publishResults(ctx: MutationCtx, event: Doc<"ninjathons">) {
  const submissions = await ctx.db
    .query("ninjathonSubmissions")
    .withIndex("by_event", (q) => q.eq("eventId", event._id))
    .collect();
  const entries: Scored[] = [];
  for (const s of submissions) {
    if (s.disqualified) continue;
    const sheets = await ctx.db
      .query("ninjathonScores")
      .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
      .collect();
    if (sheets.length === 0) throw new ConvexError("UNSCORED_SUBMISSIONS");
    entries.push({ submissionId: s._id, savedAt: s.savedAt, sheets: sheets.map((x) => x.scores) });
  }
  const now = Date.now();
  const byId = new Map(submissions.map((s) => [s._id, s]));
  for (const entry of rank(event.rubric, entries)) {
    const submission = byId.get(entry.submissionId)!;
    const team = await ctx.db.get(submission.teamId);
    await ctx.db.insert("ninjathonResults", {
      eventId: event._id,
      teamId: submission.teamId,
      submissionId: submission._id,
      teamName: team?.name ?? "Deleted player",
      place: entry.place,
      score: entry.score,
      criteria: entry.criteria,
    });
    for (const member of await teamMembers(ctx, submission.teamId)) {
      await reward(ctx, member.userId, event._id, entry.place, now);
    }
  }
  await ctx.db.patch(event._id, { status: "results", resultsAt: now });
}

async function reward(ctx: MutationCtx, userId: Id<"users">, eventId: Id<"ninjathons">, place: number, now: number) {
  const { awarded } = await awardXp(ctx, {
    userId,
    key: `ninjathon:${eventId}`,
    source: "ninjathon",
    amount: SUBMIT_XP + (PLACE_XP[place - 1] ?? 0),
  });
  // Results publish once, so this only guards a repeated call.
  if (!awarded) return;
  await grantBadge(ctx, userId, "ninjathon-participant");
  if (place === 1) await grantBadge(ctx, userId, "ninjathon-winner");

  const standing = await ctx.db
    .query("ninjathonStandings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const counts = {
    firsts: (standing?.firsts ?? 0) + (place === 1 ? 1 : 0),
    seconds: (standing?.seconds ?? 0) + (place === 2 ? 1 : 0),
    thirds: (standing?.thirds ?? 0) + (place === 3 ? 1 : 0),
    events: (standing?.events ?? 0) + 1,
    tieBreak: -now,
  };
  if (standing) await ctx.db.patch(standing._id, counts);
  else await ctx.db.insert("ninjathonStandings", { userId, ...counts });
}
