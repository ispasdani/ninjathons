import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import { grantBadge } from "./lib/badges";
import { recordDuel } from "./lib/ratings";
import { awardXp } from "./lib/xp";
import { identity, setup } from "./test.setup";

const clerkFields = {
  clerkId: "user_1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  imageUrl: "https://img.example.com/ada.png",
};

async function countUsers(t: ReturnType<typeof setup>) {
  return await t.run(async (ctx) => (await ctx.db.query("users").collect()).length);
}

describe("ensureUser", () => {
  it("refuses signed-out callers", async () => {
    const t = setup();
    await expect(t.mutation(api.user.ensureUser)).rejects.toThrowError(
      "UNAUTHENTICATED",
    );
    expect(await countUsers(t)).toBe(0);
  });

  it("creates the row from the token, once", async () => {
    const t = setup();
    const asAda = t.withIdentity(
      identity("user_1", { email: "ada@example.com", name: "Ada Lovelace" }),
    );

    const first = await asAda.mutation(api.user.ensureUser);
    const second = await asAda.mutation(api.user.ensureUser);

    expect(second).toBe(first);
    expect(await countUsers(t)).toBe(1);
    const user = await t.run((ctx) => ctx.db.get(first));
    expect(user).toMatchObject({ clerkId: "user_1", name: "Ada Lovelace" });
  });

  it("falls back to the email prefix when the token has no name", async () => {
    const t = setup();
    const id = await t
      .withIdentity(identity("user_2", { email: "grace@example.com" }))
      .mutation(api.user.ensureUser);
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.name).toBe("grace");
  });

  it("never overwrites a row the webhook already wrote", async () => {
    const t = setup();
    await t.mutation(internal.user.upsertFromClerk, clerkFields);

    await t
      .withIdentity(identity("user_1", { name: "Stale Name" }))
      .mutation(api.user.ensureUser);

    expect(await countUsers(t)).toBe(1);
    const row = await t.run((ctx) => ctx.db.query("users").first());
    expect(row?.name).toBe("Ada Lovelace");
  });
});

describe("upsertFromClerk", () => {
  it("is safe to run twice and applies updates", async () => {
    const t = setup();
    await t.mutation(internal.user.upsertFromClerk, clerkFields);
    await t.mutation(internal.user.upsertFromClerk, {
      ...clerkFields,
      name: "Ada King",
    });

    expect(await countUsers(t)).toBe(1);
    const row = await t.run((ctx) => ctx.db.query("users").first());
    expect(row?.name).toBe("Ada King");
  });
});

describe("getCurrentUser", () => {
  it("returns null when signed out or before the row exists", async () => {
    const t = setup();
    expect(await t.query(api.user.getCurrentUser)).toBeNull();
    expect(
      await t.withIdentity(identity("user_1")).query(api.user.getCurrentUser),
    ).toBeNull();
  });

  it("returns the caller's own row with the free tier by default", async () => {
    const t = setup();
    await t.mutation(internal.user.upsertFromClerk, clerkFields);
    const me = await t
      .withIdentity(identity("user_1"))
      .query(api.user.getCurrentUser);
    expect(me).toMatchObject({
      clerkId: "user_1",
      tier: "free",
      progress: { xp: 0, level: 1, title: "Initiate", levelXp: 0, nextLevelXp: 100 },
    });
  });
});

describe("deleteFromClerk", () => {
  it("removes the user and everything keyed to them", async () => {
    const t = setup();
    const userId = await t.mutation(internal.user.upsertFromClerk, clerkFields);
    const otherId = await t.mutation(internal.user.upsertFromClerk, {
      ...clerkFields,
      clerkId: "user_2",
      email: "grace@example.com",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("entitlements", {
        userId,
        tier: "pro",
        expiresAt: Date.now() + 86_400_000,
      });
      await ctx.db.insert("xpLedger", { userId, key: "solve:a:py", source: "solve", amount: 10 });
      await ctx.db.insert("xpLedger", {
        userId: otherId,
        key: "solve:a:py",
        source: "solve",
        amount: 10,
      });
      await grantBadge(ctx, userId, "first-solve");
      await grantBadge(ctx, otherId, "first-solve");
      await recordDuel(ctx, { a: userId, b: otherId, score: 1 });
    });

    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_1" });

    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      entitlements: await ctx.db.query("entitlements").collect(),
      xp: await ctx.db.query("xpLedger").collect(),
      badges: await ctx.db.query("userBadges").collect(),
      counts: await ctx.db.query("badgeCounts").collect(),
      ratings: await ctx.db.query("ratings").collect(),
      history: await ctx.db.query("ratingHistory").collect(),
    }));
    expect(left.users.map((u) => u.clerkId)).toEqual(["user_2"]);
    expect(left.entitlements).toHaveLength(0);
    expect(left.xp.map((x) => x.userId)).toEqual([otherId]);
    expect(left.badges.map((b) => b.userId)).toEqual([otherId]);
    expect(left.counts).toEqual([expect.objectContaining({ badgeId: "first-solve", holders: 1 })]);
    expect(left.ratings.map((r) => r.userId)).toEqual([otherId]);
    expect(left.history.map((h) => h.userId)).toEqual([otherId]);
  });

  it("takes them off the leaderboards and hands over their groups", async () => {
    const t = setup();
    const userId = await t.mutation(internal.user.upsertFromClerk, clerkFields);
    const otherId = await t.mutation(internal.user.upsertFromClerk, {
      ...clerkFields,
      clerkId: "user_2",
      email: "grace@example.com",
    });
    await t.run(async (ctx) => {
      await awardXp(ctx, { userId, key: "solve:a:py", source: "solve", amount: 10 });
      await ctx.db.insert("leaderboardSnapshots", { board: "level", version: 1, userId, value: 10, rank: 1 });
    });
    const groupId = await t.withIdentity(identity("user_1")).mutation(api.groups.create, { name: "Team" });
    const { inviteCode } = await t.withIdentity(identity("user_1")).query(api.groups.get, { groupId });
    await t.withIdentity(identity("user_2")).mutation(api.groups.join, { inviteCode });

    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_1" });

    const left = await t.run(async (ctx) => ({
      months: await ctx.db.query("xpMonths").collect(),
      snapshots: await ctx.db.query("leaderboardSnapshots").collect(),
      group: await ctx.db.get(groupId),
      members: await ctx.db.query("groupMembers").collect(),
    }));
    expect(left.months).toEqual([]);
    expect(left.snapshots).toEqual([]);
    expect(left.group).toMatchObject({ ownerId: otherId, memberCount: 1 });
    expect(left.members.map((m) => m.userId)).toEqual([otherId]);
  });

  it("treats a missing user as already deleted", async () => {
    const t = setup();
    await expect(
      t.mutation(internal.user.deleteFromClerk, { clerkId: "nobody" }),
    ).resolves.toBeNull();
  });
});
