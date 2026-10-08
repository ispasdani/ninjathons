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
| 3 Oct 2026 | Build plan: 11 phases with a check that marks each one done; judging core first | [12](#12-build-plan-phases) |
| 6 Oct 2026 | HTML and CSS move from phase 2 to phase 7 (Learn) | [8](#8-launch-languages), [12](#12-build-plan-phases) |
| 6 Oct 2026 | Runner speed work for the compiled languages happens in phase 4, before the load test | [5](#5-code-runner-vercel-sandbox) |
| 7 Oct 2026 | Levels start at 1; total XP is kept on the user row | [13](#13-xp-and-levels) |
| 7 Oct 2026 | 21 badges from solves and levels; rarity among players with a solve | [13](#badges) |
| 7 Oct 2026 | Ratings per area; 1v1 uses Glicko-2 with one rating period per game | [13](#ratings) |
| 7 Oct 2026 | Level and 1v1 boards with Global, Country and Group scopes; free private groups | [13](#leaderboards-and-groups) |

---

## 1. Usernames

Every user picks a unique username. It lives in Convex, not Clerk. Clerk only handles sign-in, and usernames are turned off in the Clerk dashboard so there aren't two competing ones.

- **Username vs display name.** `name` is a free-form display name ("Ada Lovelace"). `username` is the unique handle ("dani") used in `/u/[username]`, challenge-by-username, challenge links, custom profile URLs and share cards.
- **Case-insensitive uniqueness.** We store the username as typed (`username`, for display) and a lowercased copy (`usernameKey`, indexed). The mutation that sets a username checks `usernameKey` and writes it in the same transaction, so "Dani" and "dani" can never both exist.
- **Rules.** 3 to 20 characters, `a-z`, `0-9`, `_` and `-`, starting with a letter.
- **Reserved names.** Route and system words (`admin`, `api`, `dashboard`, `settings`, `u`, `support`, `help`, `login`, `signup`…) and the brand name are blocked.
- **When it's chosen.** In an onboarding step right after sign-up, before the first match. Until then the user can't be challenged by name.
- **Changing it.** Allowed with a 30-day cooldown (`usernameChangedAt`). An old username stays reserved for 90 days (and redirects to the new one, once profile pages exist in phase 8; the cooldown and reservations are built), so nobody can grab a well-known player's old name right after they change it. The same 90 days apply to the username of a deleted account.

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
- **Measured 3 Oct 2026** (Two Sum, dev deployment in eu-west-1, sandboxes in **iad1**): Run 1.2 s, Submit 2.1–2.7 s for 17 tests including 1.5 MB of gzipped large tests; a time-limit verdict about 4 s, since it waits out the limit. Sandboxes in dub1 were slower despite being nearer (create ~650 ms against ~280 ms, verdicts 2–4.4 s), so iad1 is the default (`SANDBOX_REGION` overrides it). What made the difference: saving the verdict before stopping the sandbox (stopping takes 3 s), gzipping the job, and the region. Next levers if needed: run all function-mode tests in one process (currently ~60 ms of start-up per test), and moving Convex to a US region.
- **Measured 6 Oct 2026, with the compiled languages** (Two Sum, same set-up): JavaScript, TypeScript and Python run on the managed image: Run 1.0–1.2 s, Submit 2.2–3.3 s. Java, C#, C++ and Rust run on our runner image: Run 2.7–3.8 s, Submit 3.6–7 s. Where the time goes: a sandbox from our image takes 1.2–1.9 s to start against ~0.3 s for the managed one (slimming the image from 3.2 to 2.45 GB didn't help; Vercel caches its managed images on every machine), uploading Submit's large tests ~1.2 s, compiling 0.5–1.2 s.
- **Plan for the compiled languages, in phase 4 before the load test:** mount each problem's hidden tests from a Vercel Sandbox drive instead of uploading them with every Submit (up to ~1 s off every Submit, in every language), and run all function-mode tests in one process (mostly helps Java and TypeScript). Expected result: Java, C#, C++ and Rust around 3–4 s, since compiling alone takes 0.5–1.2 s.
- **User code runs isolated (7 Oct 2026, phase 4).** Found while measuring: the job file in the sandbox held every test input, and the user's code could read it and print hidden inputs during a visible example. Vercel Sandbox gives every process every Linux capability, ambient ones included, so a plain user switch isn't enough. Now the harness writes the user's files into a folder owned by `nobody`, deletes the job, and runs the compile and every test through `setpriv` as `nobody` with all capabilities dropped and no new privileges. Checked in both images: such a process can't read the harness's files or memory and can't switch back. The local Docker runner does the same, so the driver tests run isolated.
- **Hidden test inputs on drives (7 Oct 2026, phase 4).** Each hidden tests file gets its own Vercel drive (`testDrives`), holding the inputs only (JSON and the token format), readable only by the harness. The first Submit of a file uploads as before and fills the drive in the background; later Submits mount it read-only. Measured on Two Sum: a mount adds ~0.5 s to starting a sandbox from our image but 1–1.5 s from the managed one, against ~1 s of upload saved, so drives are on for the compiled languages only (`SANDBOX_TEST_DRIVES` = off, runner or all; runner by default). Median Submit with and without: C++ 4.24 / 4.46 s, Java 4.06 / 4.91 s, C# 4.75 / 5.29 s, Rust 4.07 / 4.50 s. Uploading costs ~0.2 s plus ~0.6 s per MB of gzipped inputs, so a drive is used only for files of 1 MB or more (half of today's problems are above 500 KB). Drives of replaced tests files aren't deleted yet.
- **Function-mode tests run in batches (7 Oct 2026, phase 4).** The driver runs many tests per process: the harness sends the count and each test length-prefixed; the driver answers each with the call's own time (start-up no longer counts toward a test's time) and its result, and marks the end of each test's printed output. The visible examples run in one process and the hidden tests in another, so an example (whose output is shown) can never see a hidden input, even by looking into the driver's variables. A test that runs past its limit is killed by a timer (limit + 2 s before the first result, + 0.5 s after), so an endless loop costs one limit. Full-program problems keep one process per test. C# catches the solution's exception itself, since .NET takes a second or more to die from an unhandled one.
- **Measured 7 Oct 2026, after this work** (Two Sum Submit; before → after): C++ 5.9–6.3 → 4.5–4.6 s, C# 5.2–5.6 → 4.2–4.3 s, Java 4.0–5.0 → 4.1–4.6 s, Rust 4.2–4.5 → 3.4 s, JavaScript 2.5–2.7 → 2.1–2.7 s, Python 2.3–2.9 → 2.0–2.3 s, TypeScript 3.7–3.9 → 2.1–2.3 s. What's left for the compiled languages is mostly starting a sandbox from our image (1.5–2 s with a mount) and compiling (C++ ~1.5 s): the warm sandboxes below are the next lever, still a launch decision.
- **Load test, 7 Oct 2026 (phase 4)** (`npm run load:test [--local] [at once] [rounds]`: judgings started together through the dev deployment, all 7 languages, three Submits to one Run). Found Vercel's per-minute vCPU quota, which on **Hobby starts at 20 and rises to 40 vCPUs a minute, with 10 sandboxes at once** (Pro: 150 rising to 5,000 a minute, 10,000 at once). At 2 vCPUs a sandbox, 9 of 20 simultaneous judgings failed with a 429. Two fixes: **a refused sandbox waits and retries** with growing pauses for up to 90 s (rate and concurrency limits), and **sandboxes use 1 vCPU** (`SANDBOX_VCPUS`), which judges as fast as 2 and doubles the sandboxes per minute. Results after the fixes: 20 at once × 3 rounds, all 60 right, no errors, Submit p50 5.8 s and p95 24.9 s (waiting for the quota); 10 at once × 3 rounds, all 30 right, Submit p50 3.8 s and p95 12.6 s, with only the third round waiting. **On Hobby the site judges at most ~40 submissions a minute**; above that verdicts queue for up to tens of seconds. Pro's quota removes that limit for any load we expect; it's needed at launch anyway (Hobby is non-commercial, and it pauses sandboxes after 5,000 a month).
- **The alpha stays on Hobby** (decided 7 Oct 2026): free, and a few matches at a time fit under the quota. While a sandbox waits, the page says "Waiting for a free runner…" instead of "Judging…" (a match Submit keeps its place, since the race goes by when it was sent). Move to Pro if alpha players often see that message, or if the month's 5,000 sandboxes run low (about 600 a day if 20 players each Run or Submit 30 times), and in any case before launch. `npm run load:test --local` repeats the load test against the local runner for free; it checks our side, not Vercel's limits.
- **Launch decision, not before:** keep one or two fresh sandboxes from our image started and waiting, which hides their start-up completely while every submission still gets a never-used machine. It costs the idle machines' time, roughly tens of dollars a month each.
- **Phase 1 uses Vercel's managed `universal` image** (Node.js 24, Python 3.14), since JavaScript and Python are all it needs; `SANDBOX_IMAGE` switches to our own image when phase 2 adds the compiled languages. Locally, `problems:check` runs code with the installed Node.js and Python through the same harness (Docker isn't required yet).

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
- Verdicts stay slower than the 3-second target after the phase 4 speed work (measured 6 Oct 2026: met for JavaScript, TypeScript and Python Run; not yet for Submit or the compiled languages).

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

### As built in phase 1 (3 Oct 2026)

- **Hidden tests are one file per problem version** in Convex file storage (a JSON array of `{input, expectedOutput}`), pointed to by a `problemTests` row (`problemId`, `version`, `file`, `count`). Large tests run to megabytes, and a document holds at most 1 MB. Only internal functions read the file; nothing calls `getUrl` on it.
- **Seeding goes through storage too:** `problems:seed` uploads one JSON package per problem and calls the internal action `problems:seedFromUpload`, so no test data passes through command lines.
- **Generated tests:** `tests/generate.py` prints only inputs (fixed seed); expected outputs come from the first reference solution, run through the same driver.
- **Time limits:** `limits.timeMs` is the base; each language multiplies it (JavaScript ×1, Python ×2 for now). The check script warns when a reference uses more than half its limit.
- **Python names are snake_case** (`twoSum` → `two_sum`, parameters too), and the driver also accepts a LeetCode-style `class Solution` method.
- **What the user sees:** for examples, input, expected and actual output plus whatever the program printed; for hidden tests, only the verdict and time, not even an error message, since a program could print the hidden input to stderr and then crash on purpose.
- **Submit stops at the first failing test.** The sandbox stops at the first crash or timeout; wrong answers are found in Convex, which compares after the run.
- **The code lives in** `convex/judge/` (generators, harness, checker, verdicts, Vercel runner), `convex/submissions.ts` and `convex/judging.ts` (the action), and `scripts/` (problem loader, local runner, check and seed).

## 8. Launch languages

- **All 9 ship in V1:** JavaScript, TypeScript, Python, Java, C#, C++, Rust, HTML, CSS. This replaces the roadmap's 5.
- **The 7 code languages are ranked from day one.** They share one image, one runner and the function and stdio modes; each adds a driver generator and a docs set. In a match each player picks their own language; per-language time-limit multipliers keep it fair.
- **HTML and CSS are practice-only in V1:** tutorials and practice problems, checked in the browser (sandboxed iframe), free and instant, no XP-for-rating or ranked play.
- **Ranked HTML/CSS arrives in V1.1:** the `visual` judge mode (DOM checks and pixel matching with headless Chromium in Vercel Sandbox) and a duel screen for it. "CSS duels" is the V1.1 launch headline.
- **HTML and CSS are built in phase 7 (Learn), not phase 2** (6 Oct 2026). Their challenges are "build the same output as this one": a separate judge (render the user's page, compare it with the target) that shares nothing with the runner or the driver generators, and nothing in phases 3 to 6 needs it. They sit best next to the tutorials that teach them. Still in V1.
- Docs sets needed at launch: MDN (JS, TS, HTML, CSS), Python, Java API, .NET API (C#), cppreference (C++), Rust std. Each keeps its source and license line.

### As built in phase 2 (6 Oct 2026)

- **Two images in Vercel Sandbox:** JavaScript, TypeScript and Python run on Vercel's managed `universal` image, which Vercel keeps cached, so a sandbox starts in ~0.3 s; Java, C#, C++ and Rust on our runner image, whose sandboxes take 1.2–1.9 s to start (measured 6 Oct 2026; slimming it from 3.2 to 2.45 GB made no difference). Each language declares its image (`image` in `convex/judge/languages`).
- **One runner image** (`runner/Dockerfile`, Ubuntu 26.04): Node.js 24, Python 3.14, Java 25, .NET 10, GCC 15 (C++20), Rust 1.99. The same image runs in Vercel Sandbox, in CI and locally (`npm run runner:build`); tests and `problems:check` use it whenever it exists (`RUNNER=docker|host` forces one).
- **TypeScript runs on Node.js's type stripping**: no compile step, so it starts as fast as JavaScript. Types aren't checked, and `enum` and `namespace` are syntax errors, as in Node.
- **Compiled languages read and write a token format** (`convex/judge/wire.ts`), not JSON, so no driver needs a JSON parser. The judge converts both ways, so tests, checkers and the solve view stay JSON.
- **LeetCode's shapes:** a `Solution` class in Java, C# and C++ and an `impl Solution` in Rust; C# methods are PascalCase and Rust names snake_case. Java and C# drivers are separate files, so error lines match the editor; C++ and Rust drivers are appended after the user's code. C# gets LeetCode's implicit `using` lines.
- **Fast compiles:** C# compiles with Roslyn directly (`cs-build`), skipping MSBuild; `<bits/stdc++.h>` is precompiled; Rust compiles with plain `rustc -O`, no cargo or crates. Hello world on 2 CPUs: C# 1.2 s, C++ 0.8 s, Java 0.6 s, Rust 0.1 s.
- **Memory limits** (`limits.memoryMb`) use each runtime's own cap: V8's heap size (JavaScript, TypeScript), `-Xmx` (Java), the GC hard limit (C#), and `ulimit -v` with headroom for the runtime (Python +128 MB, C++ and Rust +64 MB). The judge recognises each runtime's out-of-memory message and gives Memory limit exceeded (`MLE`), also when Node.js spent the time limit collecting garbage first.
- **Deep recursion works:** Java and C# run the solution on a thread with a 256 MB stack; C++ and Rust get a 1 GB stack.
- **Time multipliers:** JavaScript, TypeScript, C++, Rust ×1; Java, C# ×1.5 (start-up and JIT); Python ×2.
- **Stdio mode:** Java programs are `public class Main`; C# can use top-level statements.
- **Known gaps:**
  - ~~A compile error caused by a wrong function or method name (`twosum` instead of `twoSum`) points at a line in the driver, not the user's code.~~ Fixed 7 Oct 2026 (phase 4): when the error is in the driver and not in the user's lines (a wrong name, wrong parameter types, no class Solution), the verdict is a Compile error that says "Your code needs a function named …", shows the starter code as the shape to match, and keeps the original error under it. JavaScript, TypeScript and Python, which only find out when the driver calls the function, get the same Compile error instead of a runtime error on every test. Each language decides what counts (`missingEntry` in `convex/judge/languages`).
  - The editor has syntax colouring for every language but autocomplete only for JavaScript and TypeScript (Monaco's built-in). Java, C#, C++ and Rust would need language servers; not scheduled, decide after the private alpha.

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

## 12. Build plan: phases

The roadmap's build order is now 11 phases (0 to 10), each with a check that must pass before the next phase starts. The full table is in the roadmap's Build order section.

| # | Phase | Done when |
|---|---|---|
| 0 | Setup ✅ | Auth, guardrail wrappers, schema, tests and CI, brand |
| 1 | Judging core ✅ | Two Sum goes from its folder to a correct verdict in JavaScript and Python in under about 3 s; `problems:check` runs in CI |
| 2 | Foundation ✅ | The 7 code languages, stdio mode, username onboarding, designed library and solve view, about 30 problems |
| 3 | Progression engine ✅ | Solves award XP and badges, and leaderboards update |
| 4 | 1v1 and private alpha ✅ | Runner load test passes; real matches play end to end (the friends alpha moved to the release stage, below) |
| 5 | Daily and weekly challenges ✅ | Daily pick runs unattended; 6 weekly sets written |
| 6 | Territory | Group lobbies of 3 to 6 players finish full games |
| 7 | Learn | 3 roadmaps and about 20 tutorials live; HTML and CSS challenges work |
| 8 | Profiles and Pro | Every Pro function has a test that calls it as a free user and is refused |
| 9 | Ninjathons | One event runs from creation to results (first to cut) |
| 10 | Closed beta and launch | Hosting, then the private alpha (10 to 20 friends), then 2 or 3 office teams plus 20 to 50 players; issues fixed |

**Content track:** runs alongside the build from phase 2. Problems grow from about 30 to 150–200 by launch, tutorials and roadmaps are written before phase 7, and weekly sets before phase 5.

### Everything stays local until the release stage (7 Oct 2026)

- **Nothing is hosted until every phase is built.** No production Convex deployment, no site on Vercel, no Clerk production instance until then: the release stage (phase 10) puts everything online, then runs the private alpha and the closed beta.
- **The private alpha moves from phase 4 to the release stage**, since friends can only play on a hosted site. Phase 4 is done when the runner load test passes and a real match plays end to end by hand (both 7 Oct 2026).
- Development keeps using the Convex dev deployment, the Clerk development instance and Vercel Sandbox (Hobby). Load and speed are measured there, as in phase 4.

### What changed from the first build order, and why

- **The foundation is split in two.** The runner and driver generators are the biggest unknown, and almost every feature depends on them, so they get their own phase and are proven on one problem before the rest is built.
- **Every phase has a check that marks it done,** so it's clear when a phase is finished.
- **Content is its own track.** It's too much writing to fit inside the feature phases.
- **Daily and weekly challenges move before Territory.** They reuse the solve view and progression engine, need no other players online, and bring people back every day; Territory is the most expensive feature and suffers most from empty queues.
- **A private alpha follows 1v1,** so problems with the runner and judging are found early, not only in the closed beta.
- **The runner load test moves to 1v1,** when many people first submit code at the same moment.
- **Unchanged:** the cut order if time runs short (ninjathons, then weekly challenges, then courses beyond the first roadmap), and never cutting judging quality.

## 13. XP and levels

Decided 7 Oct 2026, in phase 3.

- **Everyone starts at level 1, and level n + 1 takes 100 × n^1.5 XP in total** (rounded): level 2 at 100, level 3 at 283, level 5 at 800, level 50 at 34,300. Read literally, the roadmap's "level n needs 100 × n^1.5" would start new players at level 0, below the first title band.
- **Titles are the roadmap's placeholder names** (Initiate to Legend) until the brand names are chosen (§6).
- **Total XP is kept on the user row** (`users.xp`), updated in the same transaction as each ledger entry, so levels and leaderboards never sum the ledger. Level and title are computed from it on read, never stored.
- **Solve XP is keyed by slug** (`solve:<slug>:<language>`), since the slug never changes (§7).

### Badges

Agreed 7 Oct 2026. Names are placeholders, like the titles. Badges give no XP and are permanent once earned.

| Group | Badges (built in phase 3, 21 in all) |
|---|---|
| Milestones | First solve; 10, 50, 100 and 500 different problems solved (500 stays locked until the library is that big) |
| Difficulty | First hard problem |
| Languages | 50 problems in one language (one per language, 7); Polyglot: problems solved in 5 languages |
| Levels | One per title band from Coder (level 5) to Legend (50); Initiate has none, since everyone starts there |

Built with their phase: first ranked win, comeback win and rating tiers (4, see §14); 7-, 30- and 100-day streaks, daily challenge streaks and weekly top 10% (5); holding the Core (6); first tutorial and each finished roadmap (7); ninjathon participant and winner (9).

- **Solve counts are different problems in any language;** the language badges count per language.
- **Checked in the same transaction as the XP award:** level badges on every award, solve badges on every accepted Submit (so a rule change catches up on the user's next solve).
- **Rarity** is holders ÷ players with at least one solve (the holders of First solve), from per-badge counts kept as badges are granted and accounts deleted.

### Ratings

Decided 7 Oct 2026, in phase 3.

- **One rating per area** (`ratings`, keyed by user and area): `1v1` with Glicko-2, and `territory`, whose OpenSkill maths comes with Territory in phase 6. Ratings never mix with XP.
- **Glicko-2, one rating period per game,** as most online games run it (`convex/lib/glicko2.ts`, checked against the worked example in Glickman's paper). New players start at 1500, deviation 350, volatility 0.06, τ = 0.5. Deviation never goes above 350.
- **Provisional until 10 ranked games:** the owner sees it; leaderboards and other players don't (the plan's trust rules). No rating decay.
- **Tiers** are the placeholder bands in design.md 2.5 (Newbie below 1200 to Grandmaster from 2200). A new player's 1500 is Specialist, which stays hidden while provisional.
- **Every rated game writes `ratingHistory`** (rating after, change, opponent) for the profile chart.
- **Which games count is the caller's job:** ranked only, both players with 10 ranked games, a gap under 400, at most 3 counted games per pair per day. Built with 1v1 in phase 4, where the matches are.

### Leaderboards and groups

Agreed 7 Oct 2026, in phase 3.

- **Built now: Level (total XP, all time and per calendar month in UTC, resetting on the 1st) and 1v1.** Daily and Weekly come in phase 5, Territory in 6, Learning in 7, Ninjathons in 9. The monthly total is kept in `xpMonths` by `awardXp`.
- **Scopes now: Global, Country and Group.** Friends comes with follows in phase 8. Players set a country (with a "hide my country" option) from step 6 of this phase; until then the Country scope is empty.
- **Global and Country come from `leaderboardSnapshots`,** rebuilt every 5 minutes by a cron, page by page, with every eligible player ranked. Readers only see a finished version; old versions are deleted after each build. Last month's monthly board is kept; older ones are deleted. Fine up to about 10,000 players; past that, move to Convex's aggregate component.
- **Group boards are computed live** and list every member, 0 XP included. **Your own value is always live;** your Global and Country rank catches up on the next rebuild.
- **Ties go to whoever reached the score first** (`users.xpTieBreak`, `xpMonths.tieBreak`).
- **1v1 trust rules:** shown only after 10 ranked games and hidden after 30 days without one, with no rating decay.
- **Groups:** free and private, joined by an 8-character invite code (no look-alike characters, case-insensitive) that every member can see and share. At most 100 members per group and 10 groups per user. The owner renames, regenerates the code (the old one stops working) and removes members. A deleted group is restorable by its owner for 30 days, then purged by a daily cron. When the owner leaves or deletes their account, the member who joined first becomes owner; an empty group is deleted.

## 14. 1v1 matches

Agreed 7 Oct 2026, at the start of phase 4.

- **Difficulty follows the players' average 1v1 rating:** Easy below 1400, Medium from 1400 to 1900, Hard above. **Time limits: 15, 25 and 40 minutes.** One queue for everyone, so waits stay short. New players (1500) get Medium.
- **Each player picks their own language** before the match; the per-language time multipliers (§8) keep it fair.
- **The first accepted Submit wins, by the time it was sent,** not when its verdict came back, so a slower compile doesn't lose the race: while the opponent has an earlier Submit still being judged, the result waits for it.
- **At time up the best Submit wins:** most tests passed, then whoever sent it first. With no passes, or a full tie, it's a draw. Submits sent before time up still count when judged after it; a Submit still not judged two minutes later is treated as lost.
- **No penalty for a wrong Submit, but 10 seconds between Submits.** The opponent sees your Submit count and best test count, never your code.
- **The problem is one neither player has solved,** falling back to an unsolved problem of another difficulty, then to any. Until the approved ranked pool exists (before the closed beta, with the encrypted tests in §7), matches draw from every published problem.
- **A 10-second countdown,** with the problem hidden until it ends. Leaving during the countdown cancels the match with no result; a forfeit after it is a loss.
- **Which games count:** a ranked game changes ratings and gives match XP only within **3 per pair of players per UTC day**, for every ranked game, not just challenges, since with few players the queue pairs the same people often. Ranked challenges also need 10 ranked games each and a rating gap under 400, checked when sent and again when accepted.
- **Match XP:** 10 for a loss or draw, 25 for a win (not 10 + 25), ranked and counted only, keyed by match. A match solve also gives the normal solve XP if it's the first solve of that problem in that language.
- **Badges (7):** First win (a ranked win), Comeback (a ranked win after the opponent had passed more tests than you), and one per rating tier from Apprentice to Grandmaster, earned once the rating is no longer provisional. Names are placeholders.
- **Matchmaking:** the rating range starts at ±100 and widens by 50 every 5 seconds of waiting; after a minute anyone is a fair opponent. The longest-waiting player is paired first, with the closest rating inside the wider of the two ranges. The Find a match page sends a heartbeat every 10 seconds, and a player not seen for 30 seconds leaves the queue.
- **Challenges:** to a username, or as a link anyone signed in can accept (but not the sender, and only once). The challenger picks Ranked or Unranked, and for Unranked may fix the difficulty; ranked difficulty always follows the ratings. Each player picks their own language. **A challenge expires after 15 minutes**, since the challenger has to be around when it's accepted, and accepting starts the match at once. At most 5 open challenges per player, one per opponent. When a player's match starts, by any route, their other sent challenges are cancelled. There's no custom time limit; it follows the difficulty, as in Find a match.
- **Ghost races:** offered on Play when nobody is waiting, or after 20 seconds in the queue. A ghost is a real player's solve from a finished match (queue or challenge): the times and test counts of their Submits, replayed by the server at the same moments after the start, never their code. It's labelled "Ghost of @name" everywhere, and the race is always unranked: no rating change and no match XP (a first solve still gives its solve XP). The pick is someone else's solve of a problem you haven't solved if possible, among the 5 closest to your rating, from the last 200 finished matches. The recorded player isn't in the race and can play as normal; if they delete their account, their recordings go with it.
- **Share cards:** every finished match has a public result page, `/m/<match id>`, whose link preview is the card image. It's public because players share it; while a match is on, the page shows nothing. It shows usernames, languages, tests passed, solve time and Submits; ratings and rating changes only for players past their provisional games. No code, ever. Doc use ("used 2 doc pages", §9) joins the card with the docs library.
- **Account deletion** removes the player's side of each match, their feed events and their challenges; the opponent keeps their own result.

## 15. Daily and weekly challenges

Agreed 7 Oct 2026, at the start of phase 5. Neither challenge changes a rating (roadmap, Challenges).

### Daily challenge

- **One problem for everyone per UTC day,** picked by a cron on the hour (so a missed run is caught up within the hour), reset at 00:00 UTC.
- **Difficulty follows the weekday:** Easy on Monday and Tuesday, Medium Wednesday to Friday, Hard on Saturday and Sunday. If none of that difficulty is left, Medium, then any.
- **Never repeats:** only problems that have never been a daily, never one from a weekly set that hasn't finished, never a draft. The pick warns in the logs when fewer than 14 are left. If none at all are left, the one used longest ago is reused, with a louder warning, so a day never goes without a daily.
- **A solve counts when an accepted Submit is sent that UTC day** (by when it was sent, as in 1v1), from the solve view, not in a match. It counts even if you had solved the problem before. **Time is from when you first opened it that day;** the solve page records the opening.
- **XP: 30, plus 5 per streak day after the first, at most +50** (30 on day 1, 35 on day 2, 80 from day 11). Keyed `daily:<day>`, separate from solve XP.

### Streak

- **One streak: days in a row with the daily solved.** It drives the bonus XP, the Daily board, the freezes and the 7-, 30- and 100-day badges (the roadmap's "daily challenge streaks" are these).
- **Freezes:** one earned each time the streak reaches a multiple of 7, at most 2 held. A missed day uses one automatically (a cron just after midnight UTC settles yesterday) and keeps the streak without adding to it. With none left, the streak goes to 0. Best streak and total dailies solved are kept.

### Weekly challenge

- **A themed set of 3 to 5 new problems,** written for it and hidden until its week. Sets live in `weekly/<slug>/set.json` and are seeded like problems. A cron at 00:00 UTC on Monday starts the next unstarted set in order, which puts its problems in the library from then on; with none left, that week has no set and the logs warn.
- **Monday to Sunday, UTC** (ISO weeks, "2026-W42").
- **Points: 100 easy, 200 medium, 400 hard per problem,** for an accepted Submit sent during the week. **Tie-break: total time,** each problem timed from when you first opened it.
- **XP: 25 per problem, plus 100 for the full set,** during its week only (`weekly:<week>:<slug>`, `weekly:<week>:set`). After the week the problems are ordinary library problems.
- **Top 10% badge:** a cron on Monday settles last week; the top 10% (rounded up) of players with at least one point earn it.

### Boards and badges

- **Daily board:** current streak, then total dailies solved, then who got there first. **Weekly board:** this week's points, then less time; it starts empty each Monday, and last week's stays readable. Both have Global, Country and Group scopes, like the others. Today's daily also lists its fastest solves, live.
- **Badges (4):** 7-, 30- and 100-day streaks, and Weekly top 10%. Names are placeholders.
- **Account deletion** removes the player's streak and their daily and weekly results.

### Weekly sets as built (8 Oct 2026)

- **A set is a folder, `weekly/<slug>/`:** `set.json` (`{ "title", "order", "problems": [slugs] }`) and `theme.md`, the introduction shown on the Weekly page. Its problems are ordinary folders in `problems/`, written like any other.
- **`npm run problems:check`** with no slugs also checks the sets: 3 to 5 problems, each with a folder and not a draft, in no other set, a theme, and a unique order.
- **`npm run problems:seed`** with no slugs seeds the problems, then the sets. A set's problems are unreleased from their first seed until the set starts. Re-seeding a started set changes only its title and theme.
- **Starting:** the hourly `weekly.start` starts the next set by order on Mondays (UTC) and settles last week. `npx convex run weekly:start '{"force": true}'` starts one on any other day, for trying a set on dev.

### The first 6 sets (8 Oct 2026)

Themes chosen to cover techniques the first 30 problems barely touch. Each set has 3 to 5 new problems, easy to hard.

| Order | Set | Problems |
|---|---|---|
| 1 | Running Totals: prefix sums and difference arrays | Range Sum Queries (easy), Flight Bookings (medium), Subarray Sum Equals K (medium), Shortest Subarray with Sum at Least K (hard) |
| 2 | Guess the Answer: binary search on the answer | Integer Square Root (easy), Minimum Reading Speed (medium), Delivery Capacity (medium), Kth Smallest Pair Distance (hard) |
| 3 | Beyond the Grid: graphs | Connected Components (easy), Fewest Terms (medium), Signal Time (medium), Critical Links (hard) |
| 4 | Lines on a Timeline: intervals and sweep lines | Can Attend All (easy), Most Meetings (medium; replaces Insert Interval, too close to Merge Intervals), Rooms Needed (medium), The Skyline (hard) |
| 5 | Top of the Heap: heaps and greedy | Kth Largest (easy), Join the Ropes (medium), Smallest Covering Range (medium), Running Median (hard). Task scheduling (a counting formula) and merging sorted lists (sorting is as fast) were dropped: neither needs the heap |
| 6 | Building Up: dynamic programming, part two | House Robber (easy), Paths Around Obstacles (medium), Equal Halves (medium; replaces longest common subsequence, too close to Edit Distance), Pop the Balloons (hard) |
