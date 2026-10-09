import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import { checkUsernameRules, USERNAME_COOLDOWN_MS } from "./lib/usernames";
import { identity, setup } from "./test.setup";

async function signUp(t: ReturnType<typeof setup>, clerkId: string) {
  const as = t.withIdentity(identity(clerkId, { email: `${clerkId}@example.com`, name: clerkId }));
  const id = await as.mutation(api.user.ensureUser);
  return { as, id };
}

describe("username rules", () => {
  it.each([
    ["dani", null],
    ["Dani_99", null],
    ["a-b", null],
    ["ab", "too_short"],
    ["a".repeat(21), "too_long"],
    ["9lives", "bad_start"],
    ["_dani", "bad_start"],
    ["dani!", "bad_characters"],
    ["dañi", "bad_characters"],
    ["two words", "bad_characters"],
    ["Admin", "reserved"],
    ["ninjathons", "reserved"],
  ])("%s → %s", (name, problem) => {
    expect(checkUsernameRules(name)).toBe(problem);
  });
});

describe("setUsername", () => {
  it("refuses signed-out callers", async () => {
    const t = setup();
    await expect(t.mutation(api.user.setUsername, { username: "dani" })).rejects.toThrowError("UNAUTHENTICATED");
  });

  it("sets the name as typed, with a lowercased key, and no cooldown on the first pick", async () => {
    const t = setup();
    const { as, id } = await signUp(t, "user_1");
    await as.mutation(api.user.setUsername, { username: "Dani" });
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user).toMatchObject({ username: "Dani", usernameKey: "dani" });
    expect(user?.usernameChangedAt).toBeUndefined();
  });

  it("refuses names that break the rules", async () => {
    const t = setup();
    const { as } = await signUp(t, "user_1");
    await expect(as.mutation(api.user.setUsername, { username: "x" })).rejects.toThrowError("USERNAME_TOO_SHORT");
    await expect(as.mutation(api.user.setUsername, { username: "settings" })).rejects.toThrowError("USERNAME_RESERVED");
  });

  it("is unique regardless of letter case", async () => {
    const t = setup();
    const ada = await signUp(t, "user_1");
    const bob = await signUp(t, "user_2");
    await ada.as.mutation(api.user.setUsername, { username: "Dani" });
    await expect(bob.as.mutation(api.user.setUsername, { username: "dani" })).rejects.toThrowError("USERNAME_TAKEN");
    expect(await bob.as.query(api.user.checkUsername, { username: "DANI" })).toEqual({ ok: false, refusal: "taken" });
    expect(await ada.as.query(api.user.checkUsername, { username: "dani" })).toEqual({ ok: true });
  });

  it("allows a letter-case change at any time", async () => {
    const t = setup();
    const { as, id } = await signUp(t, "user_1");
    await as.mutation(api.user.setUsername, { username: "dani" });
    await as.mutation(api.user.setUsername, { username: "Dani" });
    expect((await t.run((ctx) => ctx.db.get(id)))?.username).toBe("Dani");
  });

  it("makes a change wait 30 days after the previous one", async () => {
    const t = setup();
    const { as, id } = await signUp(t, "user_1");
    await as.mutation(api.user.setUsername, { username: "dani" });
    await as.mutation(api.user.setUsername, { username: "dani2" });
    await expect(as.mutation(api.user.setUsername, { username: "dani3" })).rejects.toThrowError("USERNAME_COOLDOWN");

    // 30 days later.
    await t.run((ctx) => ctx.db.patch(id, { usernameChangedAt: Date.now() - USERNAME_COOLDOWN_MS - 1 }));
    await as.mutation(api.user.setUsername, { username: "dani3" });
    expect((await t.run((ctx) => ctx.db.get(id)))?.username).toBe("dani3");
  });

  it("reserves the old name for others, but lets its owner take it back", async () => {
    const t = setup();
    const ada = await signUp(t, "user_1");
    const bob = await signUp(t, "user_2");
    await ada.as.mutation(api.user.setUsername, { username: "dani" });
    await ada.as.mutation(api.user.setUsername, { username: "ada" });
    await expect(bob.as.mutation(api.user.setUsername, { username: "dani" })).rejects.toThrowError("USERNAME_TAKEN");

    await t.run((ctx) => ctx.db.patch(ada.id, { usernameChangedAt: Date.now() - USERNAME_COOLDOWN_MS - 1 }));
    await ada.as.mutation(api.user.setUsername, { username: "dani" });
    const reservations = await t.run((ctx) => ctx.db.query("usernameReservations").collect());
    expect(reservations.map((r) => r.usernameKey)).toEqual(["ada"]);
  });

  it("frees a name once its reservation expires", async () => {
    const t = setup();
    const { as } = await signUp(t, "user_1");
    await t.run((ctx) => ctx.db.insert("usernameReservations", { usernameKey: "dani", expiresAt: Date.now() - 1 }));
    await as.mutation(api.user.setUsername, { username: "dani" });
  });

  it("reserves a deleted account's name", async () => {
    const t = setup();
    const ada = await signUp(t, "user_1");
    const bob = await signUp(t, "user_2");
    await ada.as.mutation(api.user.setUsername, { username: "dani" });
    await t.mutation(internal.user.deleteFromClerk, { clerkId: "user_1" });
    await expect(bob.as.mutation(api.user.setUsername, { username: "dani" })).rejects.toThrowError("USERNAME_TAKEN");
  });
});

describe("reserved route names", () => {
  // Only the keys are read; nothing is imported.
  const routes = Object.keys(import.meta.glob(["../app/**/page.tsx", "../app/**/route.ts", "../app/**/route.tsx"]));

  it("reserves every top-level route a username could look like", () => {
    const firstSegments = new Set(
      routes
        .map((path) => path.replace("../app/", "").split("/").filter((s) => !s.startsWith("(") && !s.startsWith("[")))
        .filter((segments) => segments.length > 1)
        .map((segments) => segments[0]),
    );
    expect(firstSegments.size).toBeGreaterThan(10);
    for (const segment of firstSegments) {
      // Names the rules refuse anyway ("m" is too short) can't be taken.
      const problem = checkUsernameRules(segment);
      expect(problem === null ? `${segment} is not reserved` : "ok").toBe("ok");
    }
  });
});
