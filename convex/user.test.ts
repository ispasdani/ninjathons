import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
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
    expect(me).toMatchObject({ clerkId: "user_1", tier: "free" });
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
    });

    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_1" });

    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      entitlements: await ctx.db.query("entitlements").collect(),
      xp: await ctx.db.query("xpLedger").collect(),
    }));
    expect(left.users.map((u) => u.clerkId)).toEqual(["user_2"]);
    expect(left.entitlements).toHaveLength(0);
    expect(left.xp.map((x) => x.userId)).toEqual([otherId]);
  });

  it("treats a missing user as already deleted", async () => {
    const t = setup();
    await expect(
      t.mutation(internal.user.deleteFromClerk, { clerkId: "nobody" }),
    ).resolves.toBeNull();
  });
});
