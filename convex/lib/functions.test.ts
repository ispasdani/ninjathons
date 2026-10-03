import { describe, expect, it } from "vitest";

import type { Id } from "../_generated/dataModel";
import { identity, setup } from "../test.setup";
import { getPlan, requireUser } from "./functions";

const DAY = 86_400_000;

async function insertUser(t: ReturnType<typeof setup>, clerkId: string) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId,
      email: `${clerkId}@example.com`,
      name: clerkId,
      imageUrl: "",
    }),
  );
}

async function tierOf(t: ReturnType<typeof setup>, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const user = await ctx.db.get(userId);
    return (await getPlan(ctx, user!)).tier;
  });
}

describe("requireUser", () => {
  it("throws UNAUTHENTICATED when signed out", async () => {
    const t = setup();
    await expect(t.run((ctx) => requireUser(ctx))).rejects.toThrowError(
      "UNAUTHENTICATED",
    );
  });

  it("throws UNAUTHENTICATED when signed in but the row doesn't exist", async () => {
    const t = setup();
    await expect(
      t.withIdentity(identity("user_1")).run((ctx) => requireUser(ctx)),
    ).rejects.toThrowError("UNAUTHENTICATED");
  });

  it("returns only the caller's own row", async () => {
    const t = setup();
    await insertUser(t, "user_1");
    await insertUser(t, "user_2");
    const user = await t
      .withIdentity(identity("user_2"))
      .run((ctx) => requireUser(ctx));
    expect(user.clerkId).toBe("user_2");
  });
});

describe("getPlan", () => {
  it("is free when there is no entitlements row", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    expect(await tierOf(t, userId)).toBe("free");
  });

  it("is pro while the plan is active", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    await t.run((ctx) =>
      ctx.db.insert("entitlements", {
        userId,
        tier: "pro",
        expiresAt: Date.now() + DAY,
      }),
    );
    expect(await tierOf(t, userId)).toBe("pro");
  });

  it("falls back to free once the plan has expired", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    await t.run((ctx) =>
      ctx.db.insert("entitlements", {
        userId,
        tier: "pro",
        expiresAt: Date.now() - DAY,
      }),
    );
    expect(await tierOf(t, userId)).toBe("free");
  });

  it("ignores another user's plan", async () => {
    const t = setup();
    const payer = await insertUser(t, "user_1");
    const other = await insertUser(t, "user_2");
    await t.run((ctx) =>
      ctx.db.insert("entitlements", {
        userId: payer,
        tier: "pro",
        expiresAt: Date.now() + DAY,
      }),
    );
    expect(await tierOf(t, other)).toBe("free");
  });
});
