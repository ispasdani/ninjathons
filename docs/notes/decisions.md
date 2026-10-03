# Decisions

Decisions taken after the 27 Sept 2026 snapshots of the roadmap, plan and architecture docs. Where this file and those docs disagree, this file wins.

| Date | Decision | Section |
|---|---|---|
| 3 Oct 2026 | Usernames are our own, unique and chosen by each user | [1](#1-usernames) |
| 3 Oct 2026 | Payments use Stripe directly, not Clerk Billing | [2](#2-payments-stripe) |
| 3 Oct 2026 | Judging is a hybrid: each problem is either function mode or full-program (stdio) mode | [3](#3-judging-model-hybrid) |
| 3 Oct 2026 | Account deletion: 14-day grace period, then a batched hard delete; shared records are anonymized | [4](#4-deleting-data) |
| 3 Oct 2026 | The code runner is Vercel Sandbox, called from Convex; the desktop app runs code locally | [5](#5-code-runner-vercel-sandbox) |
| 3 Oct 2026 | Brand: Ninjathons, shuriken logo, neon green `#c4f012` accent | [6](#6-brand) |
| 3 Oct 2026 | Problems are folders of files in `problems/`: JSON settings, tests, reference and must-fail solutions | [7](#7-problem-file-format) |
| 3 Oct 2026 | All 9 languages in V1; HTML/CSS practice-only until V1.1 | [8](#8-launch-languages) |
| 3 Oct 2026 | Ranked 1v1 allows official language docs only | [9](#9-docs-in-ranked-1v1) |
| 3 Oct 2026 | Pro: about €8/month or €69/year, regional prices, early-bird pricing | [10](#10-pro-price) |
| 3 Oct 2026 | Keep both World Conquest and Battle royale; pick the order in V2 | [11](#11-world-conquest-and-battle-royale) |

---

## 1. Usernames

Every user picks a unique username. It lives in Convex, not Clerk. Clerk only handles sign-in, and usernames are turned off in the Clerk dashboard so there aren't two competing ones.

- **Username vs display name.** `name` is a free-form display name ("Ada Lovelace"). `username` is the unique handle ("dani") used in `/u/[username]`, challenge-by-username, challenge links, custom profile URLs and share cards.
- **Case-insensitive uniqueness.** We store the username as typed (`username`, for display) and a lowercased copy (`usernameKey`, indexed). The mutation that sets a username checks `usernameKey` and writes it in the same transaction, so "Dani" and "dani" can never both exist.
- **Rules.** 3 to 20 characters, `a-z`, `0-9`, `_` and `-`, starting with a letter.
- **Reserved names.** Route and system words (`admin`, `api`, `dashboard`, `settings`, `u`, `support`, `help`, `login`, `signup`…) and the brand name are blocked.
- **When it's chosen.** In an onboarding step right after sign-up, before the first match. Until then the user can't be challenged by name.
- **Changing it.** Allowed with a 30-day cooldown (`usernameChangedAt`). An old username stays reserved for 90 days (and redirects to the new one), so nobody can grab a well-known player's old name right after they change it. The same 90 days apply to the username of a deleted account.

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

## 4. Deleting data

Two kinds of deletion: **hard delete** removes the row; **soft delete** keeps it, marked with `deletedAt` or a `status`, and every query filters it out.

The rule: **soft-delete when other rows point to it or an undo makes sense; hard-delete when the data is purely personal or the law says it must go.** For account deletion under GDPR, soft delete is only a grace period, never the end state: hidden-but-stored is not erasure.

### Account deletion

| Phase | What happens |
|---|---|
| **1. Grace period (soft), 14 days** | The user clicks "Delete account" in settings. Mark `users.deletedAt`, hide the public profile and leaderboard rows, remove them from the match queue, cancel pending challenges, forfeit a live match (opponent wins, no rating change). Signing in during the 14 days offers "Restore account". |
| **2. Hard delete** | Cancel the Stripe subscription, delete email and analytics contacts, run the batched cascade below (one table at a time, about 500 rows per scheduled run, rescheduling until done), delete stored files, delete the Clerk account, then delete the `users` row last. Keep a `deletedUsers` record with a hashed Clerk id and the date, so late webhook retries and audits see the deletion finished. |

Deletion starts **in our app**, so a restore is possible. If Clerk deletes the user first (for example from the Clerk dashboard), its `user.deleted` webhook skips the grace period and goes straight to phase 2.

### What happens to each kind of data

Most of these tables don't exist yet. **Every new table gets a row here when it is created.**

| Data | Tables | On account deletion |
|---|---|---|
| Account and profile | `users`, `profiles`, `notificationPrefs`, `notifications` | Delete (`users` last) |
| Username | `users.username` | Delete, and reserve the name for 90 days |
| Uploaded and generated files | avatars, banners, share cards in Convex storage | Delete each storage id |
| Practice | `submissions`, `drafts`, `docViews`, `integritySignals` | Delete |
| Learning progress | `lessonProgress`, `roadmapProgress` | Delete |
| Progression | `xpLedger`, `userBadges`, `streaks`, `ratings`, `ratingHistory`, `dailyResults`, `weeklyResults` | Delete |
| Leaderboards | `leaderboardSnapshots` | Remove their rows (also gone on the next rebuild) |
| Queue and invites | `matchQueue`, `challenges` | Delete in phase 1 |
| Finished matches | `matches`, `matchEvents` | **Anonymize** ("Deleted player"): opponents keep their games and rating changes. Their code in those matches is deleted with `submissions` |
| Anti-cheat cases | `similarityFlags` | **Anonymize**: the opponent's case stays, the code is gone |
| Social | `follows` (both directions), `groupMembers` | Delete |
| Groups they own | `groups` | Transfer to the oldest member; delete if empty |
| Ninjathons | `registrations`, `teamMembers`, `ninjathonSubmissions`, `results` | Delete the registration before the event starts; afterwards remove them from the team, keep the team's project if it has other members, and anonymize placements and Hall of fame |
| Plan | `entitlements` | Delete |
| Stripe | subscription, invoices | Cancel the subscription. **Keep** invoices and the Stripe customer, unlinked from the account: tax law requires keeping invoices for years |
| Aggregates | solve counts and acceptance rates on `problems`, badge rarity | **Keep**: plain counts, nothing personal |
| Later (V1.2+) | problems they created, discussion comments, private ninjathons they organized | Problems anonymized ("Deleted user"); comment text replaced with "[deleted]"; ninjathons transferred or cancelled (asked at deletion time) |
| Later, if they were banned | ban record | Keep only a hash of the email, to stop ban evasion; disclosed in the privacy policy |

### Everyday deletions (not account deletion)

| Data | Treatment |
|---|---|
| `problems` | Soft: `status: "retired"`. Hidden from the library and duel pool, still readable in old results |
| `lessons`, `courses`, `roadmaps` | Soft: `status: "archived"` |
| Badge definitions | Soft: `retired: true`. People keep badges they earned |
| `matches` | Never deleted. `status` covers cancelled and forfeited |
| Ninjathon `events` | Soft: `status: "cancelled"` |
| `groups` | Soft: `deletedAt`, the owner can restore it for 30 days, then hard delete |
| Comments (V1.2) | Soft: text replaced with "[deleted]", replies stay |
| Usernames given up | A row in `usernameReservations` that expires after 90 days |
| `drafts`, `follows`, `matchQueue` | Hard delete when cleared, unfollowed or matched |
| `challenges` | Marked `expired` or `declined`, hard delete after 7 days |
| `notifications` | Hard delete after 90 days, or when the user clears them |
| `docViews`, `integritySignals` | Hard delete after 90 days |
| Replaced avatars, banners, old share cards | Hard delete when replaced |
| `submissions`, `xpLedger`, `ratings`, `streaks`, progress | Never deleted one by one; only with the account, so nobody can game levels by deleting history |

### Guarding soft-deleted rows

A soft-deleted row is still in the table, so a query that forgets the filter leaks it.

- Put `status` or `deletedAt` in the indexes (for example `problems.by_status`), so queries filter through the index instead of scanning.
- Read through shared helpers in `convex/lib` (`getActiveProblem`, `getActiveUser`…) so the filter is written once.
- Each public query gets a test that a soft-deleted row doesn't come back.

## 5. Code runner: Vercel Sandbox

User code that counts (Submit, duels, challenges, anything that gives XP or changes a rating) runs in **Vercel Sandbox**, called from Convex. This replaces Judge0 on its own VM in the architecture doc. No separate server to host or maintain, and the runner code stays in this repo.

### Why

- Each run gets its own Firecracker microVM with its own kernel: stronger isolation than containers, built for untrusted code.
- One custom image (a Dockerfile in this repo, pushed to Vercel Container Registry by a GitHub Action) carries every compiler, so all languages are covered.
- Outbound network can be blocked with a firewall policy.
- Cost: free on Hobby while building (5,000 sandboxes/month, 10 at once). At launch the site needs Vercel Pro anyway (Hobby is non-commercial), and Pro's $20 monthly usage credit covers roughly 25,000 submissions; after that about $0.0008 per submission. Spend management caps the bill.

### Languages

JavaScript, TypeScript, Python, Java, C#, C++, Rust, plus HTML and CSS. HTML and CSS are a different kind of exercise (DOM checks or pixel matching, rendered by headless Chromium), so they need their own judge mode. Launch scope: section 8.

### How it works

- **The browser never talks to the runner.** A Convex action checks the user (an internal query, as the guardrail requires) and the rate limit, creates a sandbox with the network blocked, runs the code, and reads the output.
- **One compile, then all tests.** The driver (function mode) or a wrapper script (stdio mode) compiles once and runs every test inside the same sandbox, stopping at the first failure on Submit.
- **Verdicts are decided in Convex,** not in the sandbox: Convex compares the output with the expected answers using the problem's checker. Expected outputs of hidden tests never leave Convex.
- **Everything goes through one interface,** `runCode({ language, source, tests, limits })`. Vercel Sandbox is the first implementation; a browser runner and a local desktop runner plug in beside it.
- **Exercises can be written and checked before the hosted runner exists:** the same Docker image runs locally in Docker Desktop, and a check script runs every reference solution against its tests.

### Where code runs

| Where | What runs there | Counts for XP, ratings, duels? |
|---|---|---|
| **Vercel Sandbox** (via Convex) | Submit and duels in every language; Run for Java, C#, C++, Rust; batch "write and run" programs | Yes |
| **Browser** (WASM: QuickJS, Pyodide; sandboxed iframe) | Practice Run for JavaScript, TypeScript, Python; HTML and CSS previews | No |
| **Desktop app** (later) | Everything locally on the user's computer, including a live interactive terminal and offline use | No |

### Desktop app (later)

- The desktop app runs code **locally on the user's computer**: real compilers, a real interactive terminal, no server cost, and it works offline. Compilers are downloaded per language on first use rather than bundled.
- Local runs are for practice, free roam and the terminal only. Submit, XP, ratings and duels still go to the server runner when online; offline solves never change ratings.
- The same local runner can also serve the website through `localhost` when the app is installed, so one install gives both. It must accept requests only from our site, after a pairing step with a secret token.

### Revisit when

- Submissions pass about 30,000–40,000 a month: a flat-price server (Hetzner VM) becomes cheaper. The `runCode` interface keeps that a contained change.
- The prototype shows verdicts slower than the 3-second target.

**When to prototype:** right after the pieces that let us test it properly exist: the problem file format, a handful of sample problems with reference solutions, the language Docker image, and the local check script that runs them in Docker Desktop. Then the prototype pushes that same image to Vercel Sandbox and runs the same sample problems from a Convex action, with the network blocked, and measures real cold and warm verdict times. Passing locally and in the sandbox on the same problems is the proof.

## 6. Brand

- **Name:** Ninjathons, from "hackathons". Replaces the "duelcode" placeholder in the roadmap. The domain is bought. In code the name lives only in `lib/site.ts`.
- **Logo:** a shuriken mark (`public/logo.svg`) plus a full lockup with the wordmark NINJATHONS in capitals, Orbitron Bold, outlined (`public/logo-full.svg` for light backgrounds, `public/logo-full-white.svg` for dark). Orbitron is for the logo only; the interface stays in Geist.
- **Brand color:** neon green `#c4f012`, the one accent in an otherwise monochrome interface, used in small doses (logo backdrop, one brand button per screen, *your* position and progress). It fails contrast as text on white, so light mode uses `#5e720d` for brand-colored text.
- Rules, tokens and contrast numbers: `design.md` sections 0 and 2.7. Tokens are in `app/globals.css` (`--brand`, `--brand-foreground`, `--brand-text`) and the `brand` button variant in `components/ui/button.tsx`.
- Still open: the XP title names (the roadmap ties them to the brand; ninja-themed names are an option).

## 7. Problem file format

Every exercise is a folder in `problems/<slug>/` in this (private) repo. Scripts check it and upload it to Convex; the website never imports these files.

```
problems/two-sum/
  problem.json        settings (JSON, validated against a schema)
  statement.md        what users read
  hints.md            hand-written hints, one "## Hint" section each
  tests/
    examples.json     public examples: shown in the statement, used by Run
    hidden.json       hidden tests (function mode)
    hidden/01.in/.out hidden tests (stdio mode: plain text files)
    generate.py       optional: builds large tests from a fixed seed
  solutions/
    reference.<ext>   the official correct answer (more languages optional)
    wrong-*.<ext>     known-wrong answers that must fail (required, at least one)
    slow-*.<ext>      known-too-slow answers that must time out (where the limit matters)
```

### `problem.json`

```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "tags": ["arrays", "hash-map"],
  "mode": "function",
  "signature": {
    "functionName": "twoSum",
    "params": [{ "name": "nums", "type": "int[]" }, { "name": "target", "type": "int" }],
    "returns": "int[]"
  },
  "checker": { "kind": "unordered" },
  "limits": { "timeMs": 2000, "memoryMb": 256 },
  "languages": "all",
  "pool": "practice",
  "status": "approved",
  "version": 1
}
```

- **Format:** JSON, not YAML: strict and easy to validate.
- `mode`: `function`, `stdio`, or later `visual` (HTML/CSS). `signature` only in function mode.
- `pool`: `practice`, `ranked` or `contest`; decides how secret the tests must be.
- `version` goes up whenever the tests change, so every submission records which tests judged it.
- The slug never changes once published: URLs, XP keys and submissions point to it.

### Tests

- Function mode: JSON, `{"input": {"nums": [2,7,11,15], "target": 9}, "output": [0,1]}`, type-checked against the signature.
- Stdio mode: `.in` / `.out` file pairs, since large inputs don't belong in JSON.
- At least 10 hidden tests per problem: edge cases plus large generated ones. Expected outputs of generated tests come from the reference solution, never typed by hand.

### Must-fail solutions

- **Every problem needs at least one wrong solution** that the tests must reject. This proves the tests are strong enough, not just that the right answer passes.
- A too-slow solution is added wherever the time limit is part of the problem (for example, O(n²) where O(n) is expected).

### Scripts

- `npm run problems:check`: validates every `problem.json`; then, in the language Docker image, runs the reference in every allowed language through the generated drivers, confirms it passes, confirms every `wrong-*` and `slow-*` solution fails, and suggests time limits from the reference's runtime × a per-language multiplier. Runs in CI too, so a broken problem can't be merged.
- `npm run problems:seed`: uploads to Convex, matched by slug (re-running updates, never duplicates). Examples go to `problems`, hidden tests to `problemTests`.

### Secrecy

- `practice` problems: plain files in the private repo.
- `ranked` and `contest` problems: hidden tests and solutions **encrypted with `sops`** (key on the author's machine and as a GitHub secret for CI). **Turned on before the closed beta**, when the duel pool starts to matter; until then everything is plain files with the `pool` field set.
- A lint rule blocks importing anything from `problems/` in `app/` and `components/`, so no page can ship tests to the browser.

### Schema changes (made with the seed script)

`problems` gains `pool`, `version`, `languages` and a `limits` object; `problemTests` gains `version`.

## 8. Launch languages

- **All 9 ship in V1:** JavaScript, TypeScript, Python, Java, C#, C++, Rust, HTML, CSS. This replaces the roadmap's 5.
- **The 7 code languages are ranked from day one.** They share one image, one runner and the function and stdio modes; each adds a driver generator and a docs set. In a match each player picks their own language; per-language time-limit multipliers keep it fair.
- **HTML and CSS are practice-only in V1:** tutorials and practice problems, checked in the browser (sandboxed iframe), free and instant, no XP-for-rating or ranked play.
- **Ranked HTML/CSS arrives in V1.1:** the `visual` judge mode (DOM checks and pixel matching with headless Chromium in Vercel Sandbox) and a duel screen for it. "CSS duels" is the V1.1 launch headline.
- Docs sets needed at launch: MDN (JS, TS, HTML, CSS), Python, Java API, .NET API (C#), cppreference (C++), Rust std. Each keeps its source and license line.

## 9. Docs in ranked 1v1

- **Ranked 1v1 allows official language references only** (the sets in section 8), served from Convex, which enforces the policy per mode so it can't be bypassed in the browser.
- Results show doc use: "Won in 4:12 · used 2 doc pages".
- **No-docs play is a separate Hard mode** with its own leaderboard, as already planned for contests.
- Practice keeps every doc set plus the logged "open in new tab" button.

## 10. Pro price

- **About €8/month or €69/year** at launch (yearly ≈ 2 months free), both offered from day one. Final numbers are set in Stripe before launch.
- **Regional pricing** through Stripe: lower prices in lower-income countries (for example about half in India or Brazil).
- **Early-bird:** beta users and early subscribers keep their launch price when it rises.
- **Raise the price with V1.1**, when the AI coach and replays join Pro; existing subscribers stay on their price.
- Later: a student discount, and team pricing with the Organization plan in V2.

## 11. World Conquest and Battle royale

- **Keep both** for V2; neither replaces the other.
- **Choose the order in V2 by concurrent players:** Battle royale needs 8–20 people online at the same time; World Conquest is season-long and asynchronous, so it works with fewer people online but needs generated problem variants. If concurrent players are low, build World Conquest first.
