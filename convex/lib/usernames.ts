/**
 * Username rules (docs/notes/decisions.md §1). Pure functions, shared by the
 * Convex mutation that sets a username and the onboarding form, so the form's
 * hints and the server's checks can't disagree. Uniqueness and reservations
 * are checked in the mutation, against the database.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
/** Days between username changes. */
export const USERNAME_COOLDOWN_DAYS = 30;
/** Days a given-up username stays reserved (changed or deleted account). */
export const USERNAME_RESERVED_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
export const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * DAY_MS;
export const USERNAME_RESERVED_MS = USERNAME_RESERVED_DAYS * DAY_MS;

// Route and system words, and the brand: a username becomes /u/<name>, and
// nobody should look like staff. Compared on the lowercased key.
const RESERVED = new Set([
  "about", "account", "admin", "administrator", "api", "app", "auth", "badges", "billing", "blog",
  "challenge", "challenges", "contact", "contest", "contests", "courses", "daily", "dashboard",
  "docs", "duel", "duels", "events", "explore", "faq", "groups", "help", "home", "learn", "leaderboard",
  "leaderboards", "legal", "lobby", "login", "logout", "me", "mod", "moderator", "new", "ninja",
  "ninjathon", "ninjathons", "null", "official", "onboarding", "play", "pricing", "privacy", "pro",
  "problems", "profile", "roadmaps", "root", "security", "settings", "sign-in", "sign-up", "signin",
  "signout", "signup", "solve", "staff", "status", "support", "system", "team", "terms",
  "territory", "u", "undefined", "user", "users", "weekly", "www",
]);

export type UsernameProblem = "too_short" | "too_long" | "bad_start" | "bad_characters" | "reserved";

/** The lowercased key uniqueness is checked on ("Dani" and "dani" are the same name). */
export function usernameKey(username: string): string {
  return username.toLowerCase();
}

/** What's wrong with a username by the rules alone, or null when it's fine. */
export function checkUsernameRules(username: string): UsernameProblem | null {
  if (username.length < USERNAME_MIN) return "too_short";
  if (username.length > USERNAME_MAX) return "too_long";
  if (!/^[a-zA-Z]/.test(username)) return "bad_start";
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "bad_characters";
  if (RESERVED.has(usernameKey(username))) return "reserved";
  return null;
}

/** Every reason a username can be refused, rules and database, in words for the form. */
export const USERNAME_MESSAGES: Record<UsernameProblem | "taken" | "cooldown", string> = {
  too_short: `At least ${USERNAME_MIN} characters.`,
  too_long: `At most ${USERNAME_MAX} characters.`,
  bad_start: "Start with a letter.",
  bad_characters: "Only letters, numbers, _ and -.",
  reserved: "That name is reserved.",
  taken: "That name is taken.",
  cooldown: `You can change your username once every ${USERNAME_COOLDOWN_DAYS} days.`,
};
