import { defineTable } from "convex/server";
import { v } from "convex/values";

// Free private groups, joined by invite code (roadmap, Compete: office and
// friend groups). Each has its own leaderboards. Deleting one is soft for 30
// days so the owner can restore it (decisions §4).
export const groups = defineTable({
  name: v.string(),
  ownerId: v.id("users"),
  // Upper case, from an alphabet without look-alike characters.
  inviteCode: v.string(),
  memberCount: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_inviteCode", ["inviteCode"])
  .index("by_owner", ["ownerId"])
  .index("by_deletedAt", ["deletedAt"]);

export const groupMembers = defineTable({
  groupId: v.id("groups"),
  userId: v.id("users"),
})
  .index("by_group_user", ["groupId", "userId"])
  .index("by_user", ["userId"]);
