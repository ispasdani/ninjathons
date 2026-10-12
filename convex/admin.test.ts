// The admin lock (decisions §19): every admin function is called signed out
// and as a normal player and refuses, and the last test fails when a function
// built from adminQuery or adminMutation has no entry here.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;
type Caller = ReturnType<T["withIdentity"]> | T;

const HOUR = 60 * 60 * 1000;
const START = new Date("2026-11-01T10:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const fields = {
  slug: "launch",
  title: "Launch ninjathon",
  teaser: "Build something",
  brief: "# The brief",
  startsAt: START,
  endsAt: START + 48 * HOUR,
  minTeam: 1,
  maxTeam: 4,
  rubric: [
    { name: "Idea", description: "", weight: 40 },
    { name: "Execution", description: "", weight: 60 },
  ],
  prizes: ["A trophy"],
};

async function players(t: T) {
  await t.withIdentity(identity("user_player", { name: "Player" })).mutation(api.user.ensureUser);
  const admin = await t.withIdentity(identity("user_admin", { name: "Admin" })).mutation(api.user.ensureUser);
  await t.run((ctx) => ctx.db.patch(admin, { username: "boss", usernameKey: "boss" }));
  await t.mutation(internal.admin.setRole, { username: "Boss", admin: true });
  return {
    signedOut: t as Caller,
    player: t.withIdentity(identity("user_player")) as Caller,
    admin: t.withIdentity(identity("user_admin")) as Caller,
  };
}

/** An event in judging with one submission. */
async function judged(t: T) {
  const who = await players(t);
  const eventId = await who.admin.mutation(api.ninjathonsAdmin.create, fields);
  const submissionId = await t.run(async (ctx) => {
    await ctx.db.patch(eventId, { status: "published", startsAt: Date.now() - 2 * HOUR, endsAt: Date.now() - HOUR });
    const userId = (await ctx.db.query("users").first())!._id;
    const teamId = await ctx.db.insert("ninjathonTeams", {
      eventId,
      name: "Team",
      nameKey: "team",
      captainId: userId,
      inviteCode: "ABCDEFGH",
      memberCount: 1,
    });
    await ctx.db.insert("ninjathonMembers", { eventId, teamId, userId });
    return await ctx.db.insert("ninjathonSubmissions", {
      eventId,
      teamId,
      projectName: "P",
      repoUrl: "https://github.com/a/b",
      demoUrl: "https://youtu.be/x",
      description: "",
      savedAt: Date.now() - 90 * 60 * 1000,
    });
  });
  return { who, eventId, submissionId };
}

async function refused(call: (caller: Caller) => Promise<unknown>, who: Awaited<ReturnType<typeof players>>) {
  await expect(call(who.signedOut)).rejects.toThrowError("UNAUTHENTICATED");
  await expect(call(who.player)).rejects.toThrowError("FORBIDDEN");
}

/** Every admin function, as "file:export", with its denial test. */
const ADMIN_FUNCTIONS: Record<string, () => Promise<void>> = {
  "ninjathonsAdmin:list": async () => {
    const t = setup();
    const who = await players(t);
    await refused((c) => c.query(api.ninjathonsAdmin.list, {}), who);
    await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    expect(await who.admin.query(api.ninjathonsAdmin.list, {})).toMatchObject([{ slug: "launch", stage: "draft" }]);
  },

  "ninjathonsAdmin:get": async () => {
    const t = setup();
    const who = await players(t);
    const eventId = await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    await refused((c) => c.query(api.ninjathonsAdmin.get, { eventId }), who);
    expect(await who.admin.query(api.ninjathonsAdmin.get, { eventId })).toMatchObject({ brief: "# The brief" });
  },

  "ninjathonsAdmin:create": async () => {
    const t = setup();
    const who = await players(t);
    await refused((c) => c.mutation(api.ninjathonsAdmin.create, fields), who);
    expect(await t.run((ctx) => ctx.db.query("ninjathons").collect())).toHaveLength(0);
    await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    expect(await t.run((ctx) => ctx.db.query("ninjathons").collect())).toHaveLength(1);
  },

  "ninjathonsAdmin:update": async () => {
    const t = setup();
    const who = await players(t);
    const eventId = await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    await refused((c) => c.mutation(api.ninjathonsAdmin.update, { eventId, ...fields, title: "Hacked" }), who);
    await who.admin.mutation(api.ninjathonsAdmin.update, { eventId, ...fields, title: "Renamed" });
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.title).toBe("Renamed");
  },

  "ninjathonsAdmin:publish": async () => {
    const t = setup();
    const who = await players(t);
    const eventId = await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    await refused((c) => c.mutation(api.ninjathonsAdmin.publish, { eventId }), who);
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("draft");
    await who.admin.mutation(api.ninjathonsAdmin.publish, { eventId });
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("published");
  },

  "ninjathonsAdmin:cancel": async () => {
    const t = setup();
    const who = await players(t);
    const eventId = await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    await refused((c) => c.mutation(api.ninjathonsAdmin.cancel, { eventId }), who);
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("draft");
    await who.admin.mutation(api.ninjathonsAdmin.cancel, { eventId });
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("cancelled");
  },

  "ninjathonsAdmin:submissions": async () => {
    const t = setup();
    const { who, eventId } = await judged(t);
    await refused((c) => c.query(api.ninjathonsAdmin.submissions, { eventId }), who);
    expect(await who.admin.query(api.ninjathonsAdmin.submissions, { eventId })).toHaveLength(1);
  },

  "ninjathonsAdmin:score": async () => {
    const t = setup();
    const { who, submissionId } = await judged(t);
    await refused((c) => c.mutation(api.ninjathonsAdmin.score, { submissionId, scores: [10, 10], note: "" }), who);
    expect(await t.run((ctx) => ctx.db.query("ninjathonScores").collect())).toHaveLength(0);
    await who.admin.mutation(api.ninjathonsAdmin.score, { submissionId, scores: [5, 5], note: "" });
    expect(await t.run((ctx) => ctx.db.query("ninjathonScores").collect())).toHaveLength(1);
  },

  "ninjathonsAdmin:disqualify": async () => {
    const t = setup();
    const { who, submissionId } = await judged(t);
    await refused((c) => c.mutation(api.ninjathonsAdmin.disqualify, { submissionId, reason: "x" }), who);
    expect((await t.run((ctx) => ctx.db.get(submissionId)))?.disqualified).toBeUndefined();
    await who.admin.mutation(api.ninjathonsAdmin.disqualify, { submissionId, reason: "Copied" });
    expect((await t.run((ctx) => ctx.db.get(submissionId)))?.disqualified?.reason).toBe("Copied");
  },

  "ninjathonsAdmin:publishResults": async () => {
    const t = setup();
    const { who, eventId, submissionId } = await judged(t);
    await who.admin.mutation(api.ninjathonsAdmin.score, { submissionId, scores: [5, 5], note: "" });
    await refused((c) => c.mutation(api.ninjathonsAdmin.publishResults, { eventId }), who);
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("published");
    await who.admin.mutation(api.ninjathonsAdmin.publishResults, { eventId });
    expect((await t.run((ctx) => ctx.db.get(eventId)))?.status).toBe("results");
  },
};

describe("every admin function refuses everyone else", () => {
  for (const [name, test] of Object.entries(ADMIN_FUNCTIONS)) it(name, test);
});

describe("the admin role", () => {
  it("is set and cleared only by the internal setRole", async () => {
    const t = setup();
    const who = await players(t);
    const admin = (await t.run((ctx) => ctx.db.query("users").collect())).find((u) => u.username === "boss")!;
    expect(admin.role).toBe("admin");
    await t.mutation(internal.admin.setRole, { username: "boss", admin: false });
    await expect(who.admin.query(api.ninjathonsAdmin.list, {})).rejects.toThrowError("FORBIDDEN");
    await expect(t.mutation(internal.admin.setRole, { username: "nobody", admin: true })).rejects.toThrowError(
      "UNKNOWN_PLAYER",
    );
  });

  it("goes with the account, and the events they made stay", async () => {
    const t = setup();
    const who = await players(t);
    const eventId: Id<"ninjathons"> = await who.admin.mutation(api.ninjathonsAdmin.create, fields);
    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_admin" });
    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event).toMatchObject({ slug: "launch" });
    expect(event?.createdBy).toBeUndefined();
  });
});

// --- Finding the admin functions in the source ---

const sources = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./_generated/**", "!./test.setup.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function adminFunctions() {
  const found: string[] = [];
  for (const [path, raw] of Object.entries(sources)) {
    const name = path.replace(/^\.\//, "").replace(/\.ts$/, "");
    if (name.startsWith("lib/")) continue;
    for (const match of raw.matchAll(/^export const (\w+) = (?:adminQuery|adminMutation)\(/gm)) {
      found.push(`${name}:${match[1]}`);
    }
  }
  return found.sort();
}

describe("the denial tests cover every admin function", () => {
  it("finds the known ones", () => {
    expect(adminFunctions()).toEqual(expect.arrayContaining(["ninjathonsAdmin:create", "ninjathonsAdmin:score"]));
  });

  it("has a denial test for each one", () => {
    expect(adminFunctions()).toEqual(Object.keys(ADMIN_FUNCTIONS).sort());
  });

  it("finds no admin check outside the wrappers", () => {
    // requireAdmin is private to lib/functions.ts, so the scan above sees every admin function.
    const elsewhere = Object.entries(sources).filter(
      ([path, raw]) => path !== "./lib/functions.ts" && /\brequireAdmin\b|role\s*[!=]==\s*"admin"/.test(raw),
    );
    expect(elsewhere.map(([path]) => path)).toEqual([]);
  });
});
