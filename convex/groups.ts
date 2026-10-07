import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type QueryCtx } from "./_generated/server";
import { userMutation, userQuery } from "./lib/functions";
import {
  activeGroupCount,
  cleanGroupName,
  leaveGroup,
  MAX_GROUPS_PER_USER,
  MAX_MEMBERS,
  membership,
  newInviteCode,
  normalizeInviteCode,
  RESTORE_FOR_MS,
} from "./lib/groups";

/** A live group the user belongs to, or GROUP_NOT_FOUND (never says which). */
async function memberGroup(ctx: QueryCtx, groupId: Id<"groups">, userId: Id<"users">) {
  const group = await ctx.db.get(groupId);
  if (!group || group.deletedAt !== undefined || !(await membership(ctx, groupId, userId))) {
    throw new ConvexError("GROUP_NOT_FOUND");
  }
  return group;
}

async function ownedGroup(ctx: QueryCtx, groupId: Id<"groups">, userId: Id<"users">) {
  const group = await memberGroup(ctx, groupId, userId);
  if (group.ownerId !== userId) throw new ConvexError("NOT_GROUP_OWNER");
  return group;
}

async function requireRoom(ctx: QueryCtx, userId: Id<"users">) {
  if ((await activeGroupCount(ctx, userId)) >= MAX_GROUPS_PER_USER) throw new ConvexError("TOO_MANY_GROUPS");
}

function summary(group: Doc<"groups">, userId: Id<"users">) {
  return {
    _id: group._id,
    name: group.name,
    memberCount: group.memberCount,
    isOwner: group.ownerId === userId,
    // Every member may invite others.
    inviteCode: group.inviteCode,
    deletedAt: group.deletedAt ?? null,
  };
}

export const create = userMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireRoom(ctx, ctx.user._id);
    const groupId = await ctx.db.insert("groups", {
      name: cleanGroupName(name),
      ownerId: ctx.user._id,
      inviteCode: await newInviteCode(ctx),
      memberCount: 1,
    });
    await ctx.db.insert("groupMembers", { groupId, userId: ctx.user._id });
    return groupId;
  },
});

/** Joins by invite code; joining a group you're already in just returns it. */
export const join = userMutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalizeInviteCode(inviteCode)))
      .unique();
    if (!group || group.deletedAt !== undefined) throw new ConvexError("INVITE_NOT_FOUND");
    if (await membership(ctx, group._id, ctx.user._id)) return group._id;
    if (group.memberCount >= MAX_MEMBERS) throw new ConvexError("GROUP_FULL");
    await requireRoom(ctx, ctx.user._id);
    await ctx.db.insert("groupMembers", { groupId: group._id, userId: ctx.user._id });
    await ctx.db.patch(group._id, { memberCount: group.memberCount + 1 });
    return group._id;
  },
});

/** Leaving as the owner hands the group to the member who joined first. */
export const leave = userMutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const group = await memberGroup(ctx, groupId, ctx.user._id);
    await leaveGroup(ctx, group, ctx.user._id);
  },
});

export const rename = userMutation({
  args: { groupId: v.id("groups"), name: v.string() },
  handler: async (ctx, { groupId, name }) => {
    await ownedGroup(ctx, groupId, ctx.user._id);
    await ctx.db.patch(groupId, { name: cleanGroupName(name) });
  },
});

/** The old code stops working at once. */
export const regenerateInvite = userMutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await ownedGroup(ctx, groupId, ctx.user._id);
    const inviteCode = await newInviteCode(ctx);
    await ctx.db.patch(groupId, { inviteCode });
    return inviteCode;
  },
});

export const removeMember = userMutation({
  args: { groupId: v.id("groups"), userId: v.id("users") },
  handler: async (ctx, { groupId, userId }) => {
    const group = await ownedGroup(ctx, groupId, ctx.user._id);
    if (userId === ctx.user._id) throw new ConvexError("OWNER_CANNOT_REMOVE_SELF");
    await leaveGroup(ctx, group, userId);
  },
});

/** Soft delete: hidden from members, restorable by the owner for 30 days. */
export const remove = userMutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await ownedGroup(ctx, groupId, ctx.user._id);
    await ctx.db.patch(groupId, { deletedAt: Date.now() });
  },
});

export const restore = userMutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const group = await ctx.db.get(groupId);
    if (!group || group.ownerId !== ctx.user._id || group.deletedAt === undefined) {
      throw new ConvexError("GROUP_NOT_FOUND");
    }
    if (Date.now() - group.deletedAt > RESTORE_FOR_MS) throw new ConvexError("GROUP_NOT_FOUND");
    await ctx.db.patch(groupId, { deletedAt: undefined });
  },
});

/** The caller's groups, plus deleted ones they own and can still restore. */
export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
    const groups = await Promise.all(rows.map((r) => ctx.db.get(r.groupId)));
    return groups
      .filter((g): g is Doc<"groups"> => g !== null)
      .filter((g) => g.deletedAt === undefined || g.ownerId === ctx.user._id)
      .map((g) => summary(g, ctx.user._id));
  },
});

/**
 * One group and its members, for members only; null otherwise. Takes any
 * string, since it comes from the page URL.
 */
export const get = userQuery({
  args: { groupId: v.string() },
  handler: async (ctx, args) => {
    const groupId = ctx.db.normalizeId("groups", args.groupId);
    if (!groupId) return null;
    const group = await ctx.db.get(groupId);
    if (!group || group.deletedAt !== undefined || !(await membership(ctx, groupId, ctx.user._id))) return null;
    const rows = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", groupId))
      .collect();
    const members = await Promise.all(
      rows.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          userId: r.userId,
          username: user?.username ?? null,
          name: user?.name ?? "",
          imageUrl: user?.imageUrl ?? "",
          isOwner: r.userId === group.ownerId,
          joinedAt: r._creationTime,
        };
      }),
    );
    members.sort((a, b) => a.joinedAt - b.joinedAt);
    return { ...summary(group, ctx.user._id), members };
  },
});

/** Daily: groups deleted more than 30 days ago go for good. */
export const purgeDeleted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("groups")
      .withIndex("by_deletedAt", (q) => q.gt("deletedAt", 0).lt("deletedAt", Date.now() - RESTORE_FOR_MS))
      .take(50);
    for (const group of expired) {
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_user", (q) => q.eq("groupId", group._id))
        .collect();
      for (const m of members) await ctx.db.delete(m._id);
      await ctx.db.delete(group._id);
    }
    if (expired.length === 50) await ctx.scheduler.runAfter(0, internal.groups.purgeDeleted, {});
  },
});
