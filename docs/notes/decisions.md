# Decisions

Decisions taken after the 27 Sept 2026 snapshots of the roadmap, plan and architecture docs. Where this file and those docs disagree, this file wins.

| Date | Decision | Section |
|---|---|---|
| 3 Oct 2026 | Usernames are our own, unique and chosen by each user | [1](#1-usernames) |
| 3 Oct 2026 | Payments use Stripe directly, not Clerk Billing | [2](#2-payments-stripe) |
| 3 Oct 2026 | Judging is a hybrid: each problem is either function mode or full-program (stdio) mode | [3](#3-judging-model-hybrid) |

---

## 1. Usernames

Every user picks a unique username. It lives in Convex, not Clerk. Clerk only handles sign-in, and usernames are turned off in the Clerk dashboard so there aren't two competing ones.

- **Username vs display name.** `name` is a free-form display name ("Ada Lovelace"). `username` is the unique handle ("dani") used in `/u/[username]`, challenge-by-username, challenge links, custom profile URLs and share cards.
- **Case-insensitive uniqueness.** We store the username as typed (`username`, for display) and a lowercased copy (`usernameKey`, indexed). The mutation that sets a username checks `usernameKey` and writes it in the same transaction, so "Dani" and "dani" can never both exist.
- **Rules.** 3 to 20 characters, `a-z`, `0-9`, `_` and `-`, starting with a letter.
- **Reserved names.** Route and system words (`admin`, `api`, `dashboard`, `settings`, `u`, `support`, `help`, `login`, `signup`…) and the brand name are blocked.
- **When it's chosen.** In an onboarding step right after sign-up, before the first match. Until then the user can't be challenged by name.
- **Changing it.** Allowed with a 30-day cooldown (`usernameChangedAt`). An old username stays reserved for a while (or redirects), so nobody can grab a well-known player's old name right after they change it.

## 2. Payments: Stripe

We use Stripe directly. Clerk Billing is easier to set up, but the plan needs things only Stripe covers well:

- **Regional pricing** for Pro (see `desktop-and-offline.md`).
- **One-time payments** for paid ninjathon entry.
- **Stripe Connect** to pay ninjathon organizers later.
- **EU VAT** on consumer sales, through Stripe Tax.
- **Our guardrail.** Only the Stripe webhook writes `entitlements`, and every Pro check reads that table in Convex. With Clerk Billing the plan would live in Clerk and have to be synced.

Still open, decide in the payments phase: **Stripe Tax** (we file VAT ourselves) or a **merchant of record** (Paddle, Lemon Squeezy or Stripe's managed offering handles VAT for a higher fee).

## 3. Judging model: hybrid

Each problem has a **judge mode**. Function mode is easier to start with, and full-program mode is there for when users get more advanced.

| Mode | The user writes | Used for |
|---|---|---|
| `function` | Only the function body. Starter code and a driver are generated for each language from the problem's signature. | Tutorials, courses, roadmaps, most easy and medium library problems, most 1v1 duels |
| `stdio` | The whole program: read input, print output | Advanced and Hard problems, future weekly contests, problems that don't fit one function |

### How it works

- **The runner only sees stdin/stdout.** In function mode, a generated driver reads the test input, calls the user's function and prints the result. So the runner and the checkers are the same for both modes.
- **Signatures are defined once per problem** in a small typed format, for example:
  ```json
  { "functionName": "add", "params": [{ "name": "a", "type": "int" }, { "name": "b", "type": "int" }], "returns": "int" }
  ```
- **Five generators, written once.** One per language (Python, JavaScript/TypeScript, Java, C++, C#) turns a signature into starter code and a driver. They're tested heavily once, since a driver bug means a wrong verdict.
- **Types at launch:** `int`, `long`, `double`, `bool`, `string`, plus 1D and 2D arrays of each. `ListNode` and `TreeNode` come later.
- **Test format.** Function mode: input is a JSON object of arguments (`{"a":2,"b":3}`), and the expected output is the JSON return value (`5`). Stdio mode: plain text in and out.
- **Checkers per problem:** `exact` (ignores trailing whitespace), `float` with a tolerance, and `unordered` (same items, any order).

### Rules

- **The problem sets the mode, never the player.** Both players in a duel get the same mode, so nobody writes parsing code while their opponent fills in a function.
- **The mode is visible** in the problem list and filters (a small `FUNCTION` or `FULL PROGRAM` label), so beginners don't land on a stdio problem by surprise.
- **Stdio statements spell out the exact input and output format,** with a fast-I/O note for Java and C#.
- **Ratings ignore the mode.** A solve is a solve.

### Later (not in V1)

- **"Write the whole program" toggle on function problems.** Advanced users could switch any function problem to full-program mode. This works once the generators use a simple, documented stdin format for each signature (for example `n` on one line, then the values), which the statement can show when the toggle is on. Ranked duels would keep the problem's own mode, so the toggle only applies to practice. XP and solve status count the same either way.
- **Custom checkers** for problems with many valid answers (a checker program stored with the hidden tests).
- **`ListNode` and `TreeNode` types** in signatures.
