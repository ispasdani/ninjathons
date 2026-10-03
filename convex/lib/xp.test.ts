import { describe, expect, it } from "vitest";

import { setup } from "../test.setup";
import { awardXp } from "./xp";

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

describe("awardXp", () => {
  it("awards the same key only once", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");
    const entry = { userId, key: "solve:p1:python", source: "solve" as const, amount: 20 };

    const first = await t.run((ctx) => awardXp(ctx, entry));
    const retry = await t.run((ctx) => awardXp(ctx, entry));

    expect(first.awarded).toBe(true);
    expect(retry.awarded).toBe(false);
    const rows = await t.run((ctx) => ctx.db.query("xpLedger").collect());
    expect(rows).toHaveLength(1);
  });

  it("lets different users earn the same key", async () => {
    const t = setup();
    const ada = await insertUser(t, "user_1");
    const grace = await insertUser(t, "user_2");
    const key = "solve:p1:python";

    await t.run((ctx) => awardXp(ctx, { userId: ada, key, source: "solve", amount: 20 }));
    const second = await t.run((ctx) =>
      awardXp(ctx, { userId: grace, key, source: "solve", amount: 20 }),
    );

    expect(second.awarded).toBe(true);
  });

  it("treats different keys for the same user separately", async () => {
    const t = setup();
    const userId = await insertUser(t, "user_1");

    await t.run((ctx) =>
      awardXp(ctx, { userId, key: "solve:p1:python", source: "solve", amount: 20 }),
    );
    const java = await t.run((ctx) =>
      awardXp(ctx, { userId, key: "solve:p1:java", source: "solve", amount: 20 }),
    );

    expect(java.awarded).toBe(true);
  });
});
