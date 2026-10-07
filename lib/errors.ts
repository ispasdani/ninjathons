import { ConvexError } from "convex/values";

// What to tell the user for each error code Convex functions throw.
const MESSAGES: Record<string, string> = {
  BAD_GROUP_NAME: "Group names are 1 to 50 characters.",
  TOO_MANY_GROUPS: "You can be in at most 10 groups. Leave one first.",
  INVITE_NOT_FOUND: "No group has that invite code. Check it and try again.",
  GROUP_FULL: "That group is full (100 members).",
  GROUP_NOT_FOUND: "That group doesn't exist, or you're not in it.",
  NOT_GROUP_OWNER: "Only the group's owner can do that.",
  OWNER_CANNOT_REMOVE_SELF: "To leave your own group, use Leave group.",
  UNKNOWN_COUNTRY: "Pick a country from the list.",
};

export function errorMessage(error: unknown) {
  const code = error instanceof ConvexError && typeof error.data === "string" ? error.data : "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
