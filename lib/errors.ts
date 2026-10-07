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
  USERNAME_REQUIRED: "Pick a username first.",
  ALREADY_IN_MATCH: "You're already in a match.",
  MATCH_NOT_FOUND: "That match doesn't exist, or you're not in it.",
  MATCH_OVER: "This match isn't taking Submits.",
  SUBMIT_COOLDOWN: "Wait 10 seconds between Submits.",
  UNKNOWN_PLAYER: "No player has that username.",
  CHALLENGE_SELF: "You can't challenge yourself.",
  DUPLICATE_CHALLENGE: "You've already challenged them. Wait for an answer.",
  TOO_MANY_CHALLENGES: "You have 5 open challenges. Cancel one first.",
  RANKED_NEEDS_GAMES: "Ranked challenges need 10 ranked games first. Play Find a match to get there.",
  OPPONENT_NEEDS_GAMES: "They haven't played 10 ranked games yet. Send an unranked challenge.",
  RATING_GAP: "Your ratings are 400 or more apart. Send an unranked challenge.",
  CHALLENGE_NOT_FOUND: "That challenge doesn't exist.",
  CHALLENGE_CLOSED: "That challenge was cancelled, declined or already accepted.",
  CHALLENGE_EXPIRED: "That challenge has expired.",
  OWN_CHALLENGE: "That's your own challenge.",
  OPPONENT_IN_MATCH: "They're in another match right now. Try again in a bit.",
  NO_GHOSTS: "No recorded solves to race yet.",
  NO_PROBLEMS: "No problems are available for a match right now.",
};

export function errorMessage(error: unknown) {
  const code = error instanceof ConvexError && typeof error.data === "string" ? error.data : "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
