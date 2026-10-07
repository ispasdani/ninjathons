import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { MAX_GROUPS_PER_USER, MAX_MEMBERS, RESTORE_FOR_MS } from "./lib/groups";
import { identity, setup } from "./test.setup";

type T = ReturnType<typeof setup>;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function players(t: T, ...names: string[]) {
  for (const name of names) {
    await t.mutation(internal.user.upsertFromClerk, {
      clerkId: `user_${name}`,
      email: `${name}@example.com`,
      name,
      imageUrl: "",
    });
  }
  return names.map((name) => t.withIdentity(identity(`user_${name}`)));
}

async function groupWith(t: T, owner: ReturnType<T["withIdentity"]>, ...joiners: ReturnType<T["withIdentity"]>[]) {
  const groupId = await owner.mutation(api.groups.create, { name: "  Office   team " });
  const { inviteCode } = (await owner.query(api.groups.get, { groupId }))!;
  for (const j of joiners) {
    vi.advanceTimersByTime(1000);
    await j.mutation(api.groups.join, { inviteCode: inviteCode.toLowerCase() });
  }
  return { groupId, inviteCode };
}

describe("groups", () => {
  it("creates a group with its owner as the first member", async () => {
    const t = setup();
    const [ada] = await players(t, "ada");
    const { groupId, inviteCode } = await groupWith(t, ada);
    expect(inviteCode).toMatch(/^[A-HJ-KM-NP-Z2-9]{8}$/);
    expect(await ada.query(api.groups.get, { groupId })).toMatchObject({
      name: "Office team",
      memberCount: 1,
      isOwner: true,
      members: [expect.objectContaining({ name: "ada", isOwner: true })],
    });
  });

  it("joins by code, in any case, once", async () => {
    const t = setup();
    const [ada, bob] = await players(t, "ada", "bob");
    const { groupId, inviteCode } = await groupWith(t, ada, bob);
    expect(await bob.mutation(api.groups.join, { inviteCode })).toBe(groupId);
    expect((await bob.query(api.groups.get, { groupId }))!.memberCount).toBe(2);
    await expect(bob.mutation(api.groups.join, { inviteCode: "NOPE2345" })).rejects.toThrow("INVITE_NOT_FOUND");
  });

  it("keeps groups private to their members", async () => {
    const t = setup();
    const [ada, eve] = await players(t, "ada", "eve");
    const { groupId } = await groupWith(t, ada);
    expect(await eve.query(api.groups.get, { groupId })).toBeNull();
    await expect(eve.mutation(api.groups.leave, { groupId })).rejects.toThrow("GROUP_NOT_FOUND");
    expect(await eve.query(api.groups.mine)).toEqual([]);
  });

  it("lets only the owner rename, regenerate the code and remove members", async () => {
    const t = setup();
    const [ada, bob, cy] = await players(t, "ada", "bob", "cy");
    const { groupId, inviteCode } = await groupWith(t, ada, bob);
    await expect(bob.mutation(api.groups.rename, { groupId, name: "Mine" })).rejects.toThrow("NOT_GROUP_OWNER");
    await expect(ada.mutation(api.groups.rename, { groupId, name: " " })).rejects.toThrow("BAD_GROUP_NAME");
    await ada.mutation(api.groups.rename, { groupId, name: "Platform" });

    const fresh = await ada.mutation(api.groups.regenerateInvite, { groupId });
    expect(fresh).not.toBe(inviteCode);
    await expect(cy.mutation(api.groups.join, { inviteCode })).rejects.toThrow("INVITE_NOT_FOUND");

    const bobId = (await ada.query(api.groups.get, { groupId }))!.members[1].userId;
    await ada.mutation(api.groups.removeMember, { groupId, userId: bobId });
    expect(await bob.query(api.groups.get, { groupId })).toBeNull();
    expect((await ada.query(api.groups.get, { groupId }))!.name).toBe("Platform");
  });

  it("hands the group to the earliest member when the owner leaves, and deletes it when empty", async () => {
    const t = setup();
    const [ada, bob, cy] = await players(t, "ada", "bob", "cy");
    const { groupId } = await groupWith(t, ada, bob, cy);
    await ada.mutation(api.groups.leave, { groupId });
    expect(await bob.query(api.groups.get, { groupId })).toMatchObject({ isOwner: true, memberCount: 2 });

    await cy.mutation(api.groups.leave, { groupId });
    await bob.mutation(api.groups.leave, { groupId });
    expect(await t.run((ctx) => ctx.db.get(groupId))).toBeNull();
  });

  it("limits members per group and groups per user", async () => {
    const t = setup();
    const [ada, bob] = await players(t, "ada", "bob");
    for (let i = 0; i < MAX_GROUPS_PER_USER; i++) await ada.mutation(api.groups.create, { name: `g${i}` });
    await expect(ada.mutation(api.groups.create, { name: "one more" })).rejects.toThrow("TOO_MANY_GROUPS");

    const groupId = await bob.mutation(api.groups.create, { name: "Full" });
    await t.run((ctx) => ctx.db.patch(groupId, { memberCount: MAX_MEMBERS }));
    const { inviteCode } = (await bob.query(api.groups.get, { groupId }))!;
    const [cy] = await players(t, "cy");
    await expect(cy.mutation(api.groups.join, { inviteCode })).rejects.toThrow("GROUP_FULL");
  });

  it("deletes softly: the owner can restore for 30 days, then it's purged", async () => {
    const t = setup();
    const [ada, bob] = await players(t, "ada", "bob");
    const { groupId, inviteCode } = await groupWith(t, ada, bob);
    await expect(bob.mutation(api.groups.remove, { groupId })).rejects.toThrow("NOT_GROUP_OWNER");
    await ada.mutation(api.groups.remove, { groupId });

    expect(await bob.query(api.groups.get, { groupId })).toBeNull();
    expect(await bob.query(api.groups.mine)).toEqual([]);
    expect(await ada.query(api.groups.mine)).toEqual([expect.objectContaining({ deletedAt: expect.any(Number) })]);
    await expect(bob.mutation(api.groups.join, { inviteCode })).rejects.toThrow("INVITE_NOT_FOUND");

    await ada.mutation(api.groups.restore, { groupId });
    expect((await bob.query(api.groups.get, { groupId }))!.memberCount).toBe(2);

    await ada.mutation(api.groups.remove, { groupId });
    vi.advanceTimersByTime(RESTORE_FOR_MS + 1000);
    await expect(ada.mutation(api.groups.restore, { groupId })).rejects.toThrow("GROUP_NOT_FOUND");
    await t.mutation(internal.groups.purgeDeleted, {});
    expect(await t.run((ctx) => ctx.db.get(groupId))).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("groupMembers").collect())).toEqual([]);
  });
});
