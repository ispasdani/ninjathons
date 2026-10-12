import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { groupEntries } from "./lib/leaderboards";
import { rank, stageOf } from "./lib/ninjathons";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-10-20T00:00:00Z").getTime();
const START = new Date("2026-11-01T10:00:00Z").getTime();
const END = START + 48 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const fields = {
  slug: "launch",
  title: "Launch ninjathon",
  teaser: "Build something",
  brief: "# The secret brief",
  startsAt: START,
  endsAt: END,
  minTeam: 1,
  maxTeam: 3,
  rubric: [
    { name: "Idea", description: "Is it new?", weight: 30 },
    { name: "Execution", description: "Does it work?", weight: 50 },
    { name: "Demo", description: "", weight: 20 },
  ],
  prizes: ["€500", "€250"],
};

const project = {
  projectName: "Shuriken",
  repoUrl: "https://github.com/team/shuriken",
  demoUrl: "https://youtu.be/abc",
  description: "It throws stars.",
};

/** Players with usernames, and an admin. */
async function world(t: T, names = ["ann", "bob", "cat", "dan"]) {
  const as = (name: string) => t.withIdentity(identity(`user_${name}`));
  const ids: Record<string, Id<"users">> = {};
  for (const name of [...names, "boss"]) {
    ids[name] = await t.withIdentity(identity(`user_${name}`, { name })).mutation(api.user.ensureUser);
    await t.run((ctx) => ctx.db.patch(ids[name], { username: name, usernameKey: name }));
  }
  await t.mutation(internal.admin.setRole, { username: "boss", admin: true });
  return { as, ids, admin: as("boss") };
}

async function published(t: T, w: Awaited<ReturnType<typeof world>>, over: Partial<typeof fields> = {}) {
  const eventId = await w.admin.mutation(api.ninjathonsAdmin.create, { ...fields, ...over });
  await w.admin.mutation(api.ninjathonsAdmin.publish, { eventId });
  return eventId;
}

const at = (time: number) => vi.setSystemTime(time);

/** The event page as a caller sees it, when it's neither missing nor cancelled. */
async function livePage(caller: Pick<T, "query">) {
  const page = await caller.query(api.ninjathons.get, { slug: "launch" });
  if (!page || page.cancelled) throw new Error("no live page");
  return page;
}

describe("creating events", () => {
  it("checks the length, team size, rubric and slug", async () => {
    const t = setup();
    const w = await world(t, []);
    const create = (over: Partial<typeof fields>) => w.admin.mutation(api.ninjathonsAdmin.create, { ...fields, ...over });
    await expect(create({ endsAt: START + HOUR / 2 })).rejects.toThrowError("BAD_EVENT_LENGTH");
    await expect(create({ endsAt: START + 8 * 24 * HOUR })).rejects.toThrowError("BAD_EVENT_LENGTH");
    await expect(create({ minTeam: 0 })).rejects.toThrowError("BAD_TEAM_SIZE");
    await expect(create({ maxTeam: 7 })).rejects.toThrowError("BAD_TEAM_SIZE");
    await expect(create({ minTeam: 3, maxTeam: 2 })).rejects.toThrowError("BAD_TEAM_SIZE");
    await expect(create({ rubric: [{ name: "All", description: "", weight: 100 }] })).rejects.toThrowError("BAD_RUBRIC");
    await expect(create({ rubric: fields.rubric.map((c) => ({ ...c, weight: 30 })) })).rejects.toThrowError("BAD_RUBRIC");
    await expect(create({ slug: "Not a slug!" })).rejects.toThrowError("BAD_EVENT_SLUG");
    await create({ slug: "  Launch " });
    await expect(create({})).rejects.toThrowError("EVENT_SLUG_TAKEN");
  });

  it("publishes only drafts that start in the future, and fixes them from the start", async () => {
    const t = setup();
    const w = await world(t, []);
    const late = await w.admin.mutation(api.ninjathonsAdmin.create, { ...fields, slug: "late", startsAt: NOW - HOUR, endsAt: NOW + HOUR });
    await expect(w.admin.mutation(api.ninjathonsAdmin.publish, { eventId: late })).rejects.toThrowError("EVENT_STARTS_IN_PAST");

    const eventId = await published(t, w);
    await expect(w.admin.mutation(api.ninjathonsAdmin.publish, { eventId })).rejects.toThrowError("EVENT_NOT_DRAFT");
    await expect(
      w.admin.mutation(api.ninjathonsAdmin.update, { eventId, ...fields, slug: "renamed" }),
    ).rejects.toThrowError("EVENT_SLUG_FIXED");
    await w.admin.mutation(api.ninjathonsAdmin.update, { eventId, ...fields, title: "Better title" });

    at(START + 1);
    await expect(w.admin.mutation(api.ninjathonsAdmin.update, { eventId, ...fields })).rejects.toThrowError("EVENT_LOCKED");
    // Cancelling still works, until results are out.
    await w.admin.mutation(api.ninjathonsAdmin.cancel, { eventId });
    expect(await t.query(api.ninjathons.get, { slug: "launch" })).toMatchObject({ cancelled: true });
    expect((await t.query(api.ninjathons.list, {})).running).toHaveLength(0);
  });

  it("moves through its stages by the clock", () => {
    const event = { status: "published" as const, startsAt: START, endsAt: END };
    expect(stageOf(event, START - 1)).toBe("upcoming");
    expect(stageOf(event, START)).toBe("running");
    expect(stageOf(event, END)).toBe("judging");
    expect(stageOf({ ...event, status: "results" }, END)).toBe("results");
  });
});

describe("the event page", () => {
  it("hides drafts, and sends the brief only from the start", async () => {
    const t = setup();
    const w = await world(t, []);
    await w.admin.mutation(api.ninjathonsAdmin.create, fields);
    expect(await t.query(api.ninjathons.get, { slug: "launch" })).toBeNull();
    expect(await t.query(api.ninjathons.list, {})).toEqual({ running: [], upcoming: [], past: [] });

    const eventId = (await t.run((ctx) => ctx.db.query("ninjathons").first()))!._id;
    await w.admin.mutation(api.ninjathonsAdmin.publish, { eventId });
    const before = await t.query(api.ninjathons.get, { slug: "LAUNCH" });
    expect(before).toMatchObject({ stage: "upcoming", brief: null, title: "Launch ninjathon", prizes: ["€500", "€250"] });
    expect(JSON.stringify(before)).not.toContain("secret");
    expect((await t.query(api.ninjathons.list, {})).upcoming).toMatchObject([{ slug: "launch", teams: 0 }]);

    at(START);
    expect(await t.query(api.ninjathons.get, { slug: "launch" })).toMatchObject({
      stage: "running",
      brief: "# The secret brief",
    });
    expect((await t.query(api.ninjathons.list, {})).running).toHaveLength(1);
  });
});

describe("teams", () => {
  it("form by invite code, one per player per event, up to the event's size", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w, { maxTeam: 2 });
    const teamId = await w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "  Star   throwers " });
    const page = await livePage(w.as("ann"));
    expect(page?.me).toMatchObject({ name: "Star throwers", isCaptain: true, members: [{ username: "ann" }] });
    const code = page!.me!.inviteCode!;

    await expect(w.as("bob").mutation(api.ninjathons.createTeam, { eventId, name: "STAR THROWERS" })).rejects.toThrowError(
      "TEAM_NAME_TAKEN",
    );
    expect(await w.as("bob").mutation(api.ninjathons.joinTeam, { inviteCode: code.toLowerCase() })).toBe(teamId);
    // Joining again is fine; a second team isn't.
    expect(await w.as("bob").mutation(api.ninjathons.joinTeam, { inviteCode: code })).toBe(teamId);
    await expect(w.as("bob").mutation(api.ninjathons.createTeam, { eventId, name: "Other" })).rejects.toThrowError(
      "ALREADY_ON_TEAM",
    );
    await expect(w.as("cat").mutation(api.ninjathons.joinTeam, { inviteCode: code })).rejects.toThrowError("TEAM_FULL");
    await expect(w.as("cat").mutation(api.ninjathons.joinTeam, { inviteCode: "NOPE2345" })).rejects.toThrowError(
      "TEAM_INVITE_NOT_FOUND",
    );

    // Other players never see the code or the team's members.
    expect((await livePage(w.as("cat"))).me).toBeNull();
    expect(JSON.stringify(await t.query(api.ninjathons.get, { slug: "launch" }))).not.toContain(code);
  });

  it("need a username", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w);
    await t.run((ctx) => ctx.db.patch(w.ids.ann, { username: undefined, usernameKey: undefined }));
    await expect(w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "Team" })).rejects.toThrowError(
      "USERNAME_REQUIRED",
    );
  });

  it("pass to the first joiner when the captain leaves, and go when empty", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w);
    const teamId = await w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "Team" });
    const code = (await t.run((ctx) => ctx.db.get(teamId)))!.inviteCode;
    await w.as("bob").mutation(api.ninjathons.joinTeam, { inviteCode: code });
    await w.as("cat").mutation(api.ninjathons.joinTeam, { inviteCode: code });

    await expect(w.as("bob").mutation(api.ninjathons.renameTeam, { teamId, name: "Mine" })).rejects.toThrowError(
      "NOT_CAPTAIN",
    );
    await w.as("ann").mutation(api.ninjathons.removeMember, { teamId, userId: w.ids.cat });
    await w.as("ann").mutation(api.ninjathons.leaveTeam, { teamId });
    expect(await t.run((ctx) => ctx.db.get(teamId))).toMatchObject({ captainId: w.ids.bob, memberCount: 1 });

    const fresh = await w.as("bob").mutation(api.ninjathons.newInviteCode, { teamId });
    expect(fresh).not.toBe(code);
    await expect(w.as("cat").mutation(api.ninjathons.joinTeam, { inviteCode: code })).rejects.toThrowError(
      "TEAM_INVITE_NOT_FOUND",
    );
    await w.as("bob").mutation(api.ninjathons.leaveTeam, { teamId });
    expect(await t.run((ctx) => ctx.db.get(teamId))).toBeNull();
  });

  it("lock at the start", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w);
    const teamId = await w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "Team" });
    const code = (await t.run((ctx) => ctx.db.get(teamId)))!.inviteCode;
    at(START);
    await expect(w.as("bob").mutation(api.ninjathons.joinTeam, { inviteCode: code })).rejects.toThrowError(
      "REGISTRATION_CLOSED",
    );
    await expect(w.as("bob").mutation(api.ninjathons.createTeam, { eventId, name: "Late" })).rejects.toThrowError(
      "REGISTRATION_CLOSED",
    );
    await expect(w.as("ann").mutation(api.ninjathons.leaveTeam, { teamId })).rejects.toThrowError("REGISTRATION_CLOSED");
    expect((await livePage(w.as("ann"))).me?.inviteCode).toBeNull();
  });
});

describe("submissions", () => {
  it("open while the event runs, for teams at the minimum, and close at the deadline", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w, { minTeam: 2 });
    const teamId = await w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "Team" });
    const save = (who: string, over = {}) => w.as(who).mutation(api.ninjathons.saveSubmission, { teamId, ...project, ...over });

    await expect(save("ann")).rejects.toThrowError("SUBMISSIONS_CLOSED");
    at(START + HOUR);
    await expect(save("ann")).rejects.toThrowError("TEAM_TOO_SMALL");
    await t.run((ctx) => ctx.db.patch(eventId, { minTeam: 1 }));
    await expect(save("ann", { repoUrl: "http://github.com/x" })).rejects.toThrowError("BAD_LINK");
    await expect(save("ann", { description: "x".repeat(1001) })).rejects.toThrowError("DESCRIPTION_TOO_LONG");
    await expect(save("bob")).rejects.toThrowError("TEAM_NOT_FOUND");
    await save("ann");
    await save("ann", { projectName: "Shuriken 2" });
    const rows = await t.run((ctx) => ctx.db.query("ninjathonSubmissions").collect());
    expect(rows).toMatchObject([{ projectName: "Shuriken 2", savedBy: w.ids.ann }]);
    expect((await livePage(w.as("ann"))).me?.submission).toMatchObject({
      projectName: "Shuriken 2",
    });
    // Nobody else sees it before results.
    expect(JSON.stringify(await w.as("bob").query(api.ninjathons.get, { slug: "launch" }))).not.toContain("Shuriken");

    at(END);
    await expect(save("ann")).rejects.toThrowError("SUBMISSIONS_CLOSED");
  });
});

describe("judging and results", () => {
  /** Ann and Dan's team and two solo teams (Bob, Cat), all submitted; the clock just past the end. */
  async function finished(t: T) {
    const w = await world(t);
    const eventId = await published(t, w);
    const teams: Record<string, Id<"ninjathonTeams">> = {};
    for (const name of ["ann", "bob", "cat"]) {
      teams[name] = await w.as(name).mutation(api.ninjathons.createTeam, { eventId, name: `Team ${name}` });
    }
    const code = (await t.run((ctx) => ctx.db.get(teams.ann)))!.inviteCode;
    await w.as("dan").mutation(api.ninjathons.joinTeam, { inviteCode: code });
    at(START + HOUR);
    for (const name of ["ann", "bob", "cat"]) {
      at(Date.now() + 60_000);
      await w.as(name).mutation(api.ninjathons.saveSubmission, { teamId: teams[name], ...project, projectName: `P ${name}` });
    }
    const submissions = async () => await w.admin.query(api.ninjathonsAdmin.submissions, { eventId });
    // No judging before the end.
    expect(await submissions()).toEqual([]);
    const early = (await t.run((ctx) => ctx.db.query("ninjathonSubmissions").first()))!._id;
    await expect(
      w.admin.mutation(api.ninjathonsAdmin.score, { submissionId: early, scores: [1, 1, 1], note: "" }),
    ).rejects.toThrowError("NOT_JUDGING");
    await expect(w.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId })).rejects.toThrowError("NOT_JUDGING");
    at(END + 1);
    const ids = Object.fromEntries((await submissions()).map((s) => [s.teamName.slice(5), s._id]));
    return { w, eventId, teams, ids, submissions };
  }

  it("ranks by the judges' average, rewards the placed teams, and shows the results", async () => {
    const t = setup();
    const { w, eventId, ids, submissions } = await finished(t);
    await t.withIdentity(identity("user_judge2", { name: "Judge" })).mutation(api.user.ensureUser);
    await t.run(async (ctx) => {
      const judge = (await ctx.db.query("users").collect()).find((u) => u.name === "Judge")!;
      await ctx.db.patch(judge._id, { role: "admin" });
    });
    const judge2 = t.withIdentity(identity("user_judge2"));
    const score = (who: typeof judge2, team: string, scores: number[], note = "") =>
      who.mutation(api.ninjathonsAdmin.score, { submissionId: ids[team], scores, note });

    await expect(score(w.admin, "ann", [10, 10])).rejects.toThrowError("BAD_SCORES");
    await expect(score(w.admin, "ann", [10, 11, 0])).rejects.toThrowError("BAD_SCORES");
    // ann: (30·8 + 50·9 + 20·7)/10 = 83, and 72 from the second judge, so 77.5.
    await score(w.admin, "ann", [8, 9, 7], "Strong");
    await score(judge2, "ann", [6, 8, 7]);
    // bob: 72.
    await score(w.admin, "bob", [6, 8, 7]);
    await expect(w.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId })).rejects.toThrowError(
      "UNSCORED_SUBMISSIONS",
    );
    // cat is disqualified, so needs no sheet.
    await w.admin.mutation(api.ninjathonsAdmin.disqualify, { submissionId: ids.cat, reason: "Built before the start" });
    const sheet = (await submissions()).find((s) => s.teamName === "Team ann")!;
    expect(sheet).toMatchObject({ sheets: 2, mine: { scores: [8, 9, 7], note: "Strong", total: 83 } });

    await w.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId });
    await expect(w.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId })).rejects.toThrowError("NOT_JUDGING");
    await expect(w.admin.mutation(api.ninjathonsAdmin.cancel, { eventId })).rejects.toThrowError("EVENT_HAS_RESULTS");

    const page = await livePage(t);
    expect(page?.stage).toBe("results");
    expect(page?.results).toMatchObject([
      { place: 1, teamName: "Team ann", score: 77.5, criteria: [7, 8.5, 7], members: [{ username: "ann" }, { username: "dan" }] },
      { place: 2, teamName: "Team bob", score: 72, project: { projectName: "P bob" } },
    ]);
    const text = JSON.stringify(page);
    expect(text).not.toContain("Strong");
    expect(text).not.toContain("Built before");
    expect(text).not.toContain("P cat");

    const xp = async (name: string) => (await t.run((ctx) => ctx.db.get(w.ids[name])))?.xp ?? 0;
    expect(await xp("ann")).toBe(1200);
    expect(await xp("dan")).toBe(1200);
    expect(await xp("bob")).toBe(950);
    expect(await xp("cat")).toBe(0);
    const badges = async (name: string) =>
      (await t.run((ctx) => ctx.db.query("userBadges").collect())).filter((b) => b.userId === w.ids[name]).map((b) => b.badgeId);
    expect(await badges("ann")).toEqual(expect.arrayContaining(["ninjathon-participant", "ninjathon-winner"]));
    expect(await badges("bob")).toContain("ninjathon-participant");
    expect(await badges("bob")).not.toContain("ninjathon-winner");
    expect(await badges("cat")).toEqual([]);

    // The Ninjathons board.
    const board = await t.run((ctx) => groupEntries(ctx, "ninjathons", [w.ids.bob, w.ids.cat, w.ids.ann]));
    expect(board.map((r) => r.userId)).toEqual([w.ids.ann, w.ids.bob]);
    expect(await t.run((ctx) => ctx.db.query("ninjathonStandings").collect())).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: w.ids.bob, firsts: 0, seconds: 1, events: 1 })]),
    );
    expect((await t.query(api.ninjathons.list, {})).past).toMatchObject([{ slug: "launch", stage: "results" }]);
  });

  it("takes no scores once results are out", async () => {
    const t = setup();
    const { w, ids, eventId } = await finished(t);
    for (const id of Object.values(ids)) {
      await w.admin.mutation(api.ninjathonsAdmin.score, { submissionId: id, scores: [1, 1, 1], note: "" });
    }
    await w.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId });
    await expect(
      w.admin.mutation(api.ninjathonsAdmin.score, { submissionId: ids.ann, scores: [9, 9, 9], note: "" }),
    ).rejects.toThrowError("NOT_JUDGING");
  });
});

describe("ranking", () => {
  const rubric = fields.rubric;
  it("breaks ties on the heaviest criterion, then the earlier save", () => {
    const id = (s: string) => s as Id<"ninjathonSubmissions">;
    // Both total 60: a scores higher on Execution (weight 50).
    const placed = rank(rubric, [
      { submissionId: id("b"), savedAt: 1, sheets: [[10, 4, 5]] },
      { submissionId: id("a"), savedAt: 2, sheets: [[5, 7, 5.5]] },
      { submissionId: id("c"), savedAt: 0, sheets: [[5, 7, 5.5]] },
    ]);
    expect(placed.map((p) => [p.submissionId, p.place])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]);
  });
});

describe("account deletion", () => {
  it("before the start: the membership goes, and the captain passes on", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w);
    const teamId = await w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "Team" });
    const solo = await w.as("cat").mutation(api.ninjathons.createTeam, { eventId, name: "Solo" });
    const code = (await t.run((ctx) => ctx.db.get(teamId)))!.inviteCode;
    await w.as("bob").mutation(api.ninjathons.joinTeam, { inviteCode: code });

    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_ann" });
    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_cat" });
    expect(await t.run((ctx) => ctx.db.get(teamId))).toMatchObject({ captainId: w.ids.bob, memberCount: 1 });
    expect(await t.run((ctx) => ctx.db.get(solo))).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("ninjathonMembers").collect())).toHaveLength(1);
  });

  it("after results: teams with others keep their project, and a solo placing is anonymized", async () => {
    const t = setup();
    const w = await world(t);
    const eventId = await published(t, w);
    const team = await w.as("ann").mutation(api.ninjathons.createTeam, { eventId, name: "Team ann" });
    const solo = await w.as("cat").mutation(api.ninjathons.createTeam, { eventId, name: "Cat alone" });
    const code = (await t.run((ctx) => ctx.db.get(team)))!.inviteCode;
    await w.as("bob").mutation(api.ninjathons.joinTeam, { inviteCode: code });
    at(START + HOUR);
    await w.as("ann").mutation(api.ninjathons.saveSubmission, { teamId: team, ...project });
    await w.as("cat").mutation(api.ninjathons.saveSubmission, { teamId: solo, ...project, projectName: "Cat project" });
    at(END + 1);
    for (const s of await w.admin.query(api.ninjathonsAdmin.submissions, { eventId })) {
      await w.admin.mutation(api.ninjathonsAdmin.score, { submissionId: s._id, scores: [5, 5, 5], note: "" });
    }
    await w.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId });

    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_ann" });
    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_cat" });
    const page = await livePage(t);
    expect(page?.results).toHaveLength(2);
    const kept = page!.results!.find((r) => r.teamName === "Team ann")!;
    expect(kept.members.map((m) => m.username)).toEqual(["bob"]);
    expect(kept.project?.projectName).toBe("Shuriken");
    const gone = page!.results!.find((r) => r.teamName === "Deleted player")!;
    expect(gone.project).toBeNull();
    expect(JSON.stringify(page)).not.toContain("Cat");
    expect(await t.run((ctx) => ctx.db.query("ninjathonStandings").collect())).toHaveLength(1);
  });
});
