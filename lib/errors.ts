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
  LOBBY_NOT_FOUND: "That lobby doesn't exist, or you're not its host.",
  LOBBY_CLOSED: "That lobby has closed. Ask for a new link.",
  LOBBY_FULL: "That lobby is full (6 players).",
  NOT_ENOUGH_PLAYERS: "A Territory game needs 3 players.",
  PLAYER_IN_MATCH: "Someone in the lobby is in another match. Wait for them to finish.",
  TERRITORY_NEEDS_GAMES: "Everyone needs 10 ranked Territory games for a ranked game.",
  RATING_SPREAD: "Your Territory ratings are 400 or more apart. Play unranked.",
  GAME_NOT_FOUND: "That game doesn't exist, or you're not in it.",
  GAME_OVER: "This game isn't taking Submits.",
  REGION_NOT_FOUND: "Pick a region on the map.",
  NOT_YOUR_PROBLEM: "That region needs a different problem now. Pick it again on the map.",
  DECK_EMPTY: "You've used every problem of that difficulty.",
  HOME_BASE: "Home bases can't be taken.",
  ALREADY_YOURS: "That region is already yours.",
  NOT_NEXT_TO_YOURS: "You can only take regions next to one you hold.",
  SHIELDED: "That region was just taken and is shielded for a minute.",
  PRO_REQUIRED: "That's a Pro feature.",
  BIO_TOO_LONG: "Keep your bio to 160 characters.",
  BAD_LINK: "Links must start with https:// and go to a real site.",
  TOO_MANY_LINKS: "Up to 4 links.",
  TOO_MANY_LANGUAGES: "Pick up to 3 languages.",
  THEME_NOT_FOUND: "Pick a theme from the list.",
  THEME_LOCKED: "You haven't unlocked that theme yet.",
  ACCENT_CONTRAST: "That accent is hard to read on this theme in light or dark mode. Try a stronger colour.",
  BAD_BANNER: "Pick a banner from the list.",
  BAD_FONT: "Pick a font from the list.",
  BAD_SECTION: "Something's off with the sections. Reload and try again.",
  NOT_PINNABLE: "Only your own accepted Submits can be pinned.",
  PIN_HELD: "That problem is in today's daily or a weekly set that isn't over. Pin it once it's done.",
  PINS_FULL: "You can pin 3 solutions. Unpin one first.",
};

export function errorCode(error: unknown) {
  return error instanceof ConvexError && typeof error.data === "string" ? error.data : "";
}

export function errorMessage(error: unknown) {
  const code = error instanceof ConvexError && typeof error.data === "string" ? error.data : "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}
