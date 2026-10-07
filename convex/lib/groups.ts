/**
 * Group rules shared by groups.ts and account deletion (decisions §4, §13).
 */
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const MAX_MEMBERS = 100;
export const MAX_GROUPS_PER_USER = 10;
export const MAX_NAME_LENGTH = 50;
// A deleted group can be restored by its owner for this long.
export const RESTORE_FOR_MS = 30 * 24 * 60 * 60 * 1000;

// No 0/O, 1/I/L: codes get read out loud and typed by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function cleanGroupName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) throw new ConvexError("BAD_GROUP_NAME");
  return trimmed;
}

/** Codes are case-insensitive; this is the stored form. */
export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

export async function newInviteCode(ctx: QueryCtx) {
  // Bytes past the last whole multiple of the alphabet are skipped, so every
  // character is equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  for (;;) {
    let code = "";
    while (code.length < CODE_LENGTH) {
      for (const b of crypto.getRandomValues(new Uint8Array(CODE_LENGTH))) {
        if (b < limit && code.length < CODE_LENGTH) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
      }
    }
    const taken = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!taken) return code;
  }
}

export async function membership(ctx: QueryCtx, groupId: Id<"groups">, userId: Id<"users">) {
  return await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();
}

/** Groups the user is in that count toward the limit (deleted ones don't). */
export async function activeGroupCount(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("groupMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const groups = await Promise.all(rows.map((r) => ctx.db.get(r.groupId)));
  return groups.filter((g) => g && g.deletedAt === undefined).length;
}

/**
 * Takes a user out of a group. When the owner goes, the oldest remaining
 * member becomes owner; a group left empty is deleted.
 */
export async function leaveGroup(ctx: MutationCtx, group: Doc<"groups">, userId: Id<"users">) {
  const row = await membership(ctx, group._id, userId);
  if (!row) return;
  await ctx.db.delete(row._id);

  if (group.ownerId !== userId) {
    await ctx.db.patch(group._id, { memberCount: group.memberCount - 1 });
    return;
  }
  const members = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) => q.eq("groupId", group._id))
    .collect();
  if (members.length === 0) {
    await ctx.db.delete(group._id);
    return;
  }
  // Index order is by user id, so find the member who joined first.
  const oldest = members.reduce((a, b) => (a._creationTime <= b._creationTime ? a : b));
  await ctx.db.patch(group._id, { ownerId: oldest.userId, memberCount: group.memberCount - 1 });
}
