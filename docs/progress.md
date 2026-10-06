# Progress

Where the build stands against the phases in the roadmap (Build order) and [decisions §12](notes/decisions.md#12-build-plan-phases). Update this file in the same commit as the work: change the phase table when a phase starts or finishes, and add a log entry, newest first.

**Now:** Phase 2, Foundation, is done. **Next step:** start phase 3, the progression engine (XP ledger, levels, badges, ratings, leaderboards).

## Phases

| # | Phase | Status | Started | Finished |
|---|---|---|---|---|
| 0 | Setup | Done | 27 Sept 2026 | 3 Oct 2026 |
| 1 | Judging core | Done | 3 Oct 2026 | 6 Oct 2026 |
| 2 | Foundation | Done | 6 Oct 2026 | 6 Oct 2026 |
| 3 | Progression engine | Not started | | |
| 4 | 1v1 and private alpha | Not started | | |
| 5 | Daily and weekly challenges | Not started | | |
| 6 | Territory | Not started | | |
| 7 | Learn | Not started | | |
| 8 | Profiles and Pro | Not started | | |
| 9 | Ninjathons | Not started | | |
| 10 | Closed beta and launch | Not started | | |

Content track: 30 of 150–200 problems, 0 of ~20 tutorials, 0 of 3 roadmaps, 0 of 6 weekly sets.

## Log

Each entry: date, phase, what was done, and anything left open. One entry per piece of work, not per commit.

### 6 Oct 2026 · Phase 2 done
- The check passes: a new user signs up, picks a username and solves any of 30 problems in any of the 7 code languages. Username onboarding was checked by hand; every problem's references are Accepted by `problems:check` in the runner image, and Two Sum and Sum of a List in all their languages in the real sandbox.
- Phase 2 delivered: the 7 code languages with function and stdio mode; the runner image in Vercel Container Registry; memory limits; username onboarding; the problem library; the designed solve view; 30 problems.
- HTML and CSS moved to phase 7 (decisions §8).
- Carried into later phases (planned in decisions §1, §5 and §8, and the roadmap's phase 4 and 8 rows):
  - Speed of the compiled languages (Java, C#, C++, Rust: Run 2.7–3.8 s, Submit 3.6–7 s): phase 4.
  - Compile errors caused by a wrong function name point at a driver line: phase 4.
  - No autocomplete for Java, C#, C++ and Rust: not scheduled.
  - Redirects from an old username: phase 8.

### 6 Oct 2026 · Phase 2: problem library and solve view
- `/problems` (public): every published problem with search and filters for difficulty, type, topic and, when signed in, status (solved, attempted), plus your solved progress. The dashboard shows progress and where to carry on.
- The solve view per design.md 5.2: a resizable split (drag or arrow keys, sizes remembered) with Description and Submissions tabs, the editor, and results docked under it. Catppuccin Latte and Mocha editor themes. Opening a past submission loads its code. Full-program problems start from a template per language.
- Checked: production build, library in the browser (filters, phone width). The signed-in solve view still needs a look by hand.

### 6 Oct 2026 · Phase 2: memory limits
- Each problem's memory limit is enforced in all 7 languages (decisions §8, as built), with a new verdict, Memory limit exceeded (`MLE`). Tested per language: a program allocating gigabytes gets MLE, a normal one passes under 64 MB. All 30 problems pass under their 256 MB limits.
- Closes the open item carried over from phase 1.

### 6 Oct 2026 · Phase 2: 28 new problems (30 in total)
- 12 easy, 13 medium, 3 hard (fizz-buzz to edit-distance), 4 of them stdio (sum-of-a-list, count-primes, grid-shortest-path, word-frequency).
- Each has JavaScript and Python references written independently: expected outputs come from the first and the second must agree. Every problem has a wrong solution that must fail, and 15 have a slow one that must time out. Hidden tests come from fixed-seed generators: edge cases plus large inputs.
- All 30 pass `problems:check` and are seeded on the dev deployment; sum-of-a-list (stdio, C++ too) is Accepted in the real sandbox.

### 6 Oct 2026 · Phase 2: username onboarding
- Usernames (decisions §1): rules in `convex/lib/usernames.ts`, shared by the server and the form; `user.setUsername` checks uniqueness on the lowercased key in the same transaction; `user.checkUsername` for the form as you type.
- `usernameReservations`: a changed username is held 90 days for its owner only, and a deleted account's for 90 days; changes wait 30 days (the first pick and letter-case changes don't).
- `/onboarding` page; signed-in users without a username are sent there from any app page, then back. The dashboard shows @username.
- 30 tests for the rules, uniqueness, cooldown and reservations.
- Open: redirects from an old username wait for profile pages (`/u/[username]`).

### 6 Oct 2026 · Phase 2: faster verdicts
- JavaScript, TypeScript and Python run on Vercel's managed image again (same Node.js 24 and Python 3.14): Run 1.0–1.2 s, Submit 2.2–3.3 s on Two Sum in the real sandbox.
- Runner image slimmed from 3.2 to 2.45 GB (only Roslyn from the .NET SDK, no ASP.NET, jlink modules or docs). Its sandboxes still take 1.2–1.9 s to start, so size isn't the cause; Vercel caches its managed images on every machine.
- Java, C#, C++, Rust: Run 2.7–3.8 s, Submit 3.6–7 s.
- Open: the compiled languages are over the 3-second target; Submit's test upload (~1.2 s) affects every language.

### 6 Oct 2026 · Phase 2: runner image live in Vercel Sandbox
- Runner image pushed to Vercel Container Registry from GitHub Actions (OIDC, no stored secret) and used by the Convex dev deployment (`SANDBOX_IMAGE=runner:<sha>`). Vercel project connected to the repository; Vercel Git deploys off (`vercel.json`) until we host.
- `npm run sandbox:bench` times every reference solution in the real sandbox (`convex/benchmark.ts`). Two Sum, all 7 languages Accepted. Run 2.2–4.8 s, Submit 2.5–6.9 s; JavaScript, Python and Rust fastest, C++, C# and Java slowest.
- Where the time goes: starting a sandbox from our image takes ~1.5 s against ~0.3 s for Vercel's managed image (same day, same code); uploading Submit's large tests ~1.2 s; compiling 0.5–1 s.
- Open: the 3-second target isn't met yet for the compiled languages.

### 6 Oct 2026 · Phase 2: drivers for all 7 languages
- Function-mode drivers for TypeScript, Java, C#, C++ and Rust, in LeetCode's shapes (decisions §8, as built). Compiled languages use a token format (`convex/judge/wire.ts`) that the judge converts to and from JSON.
- Native crashes say what happened (segmentation fault, division by zero) instead of nothing.
- Tests and `problems:check` run in the runner image (`npm run runner:build`), locally and in CI. Driver tests: every signature type, crashes, error lines, time limits, starter code and stdio mode, in all 7 languages (183 tests).
- Reference solutions in all 7 languages for two-sum and add-two-integers, plus 32-bit-overflow wrong solutions in Java and Rust and an O(n²) C++ one that times out. `problems:check` passes.

### 6 Oct 2026 · Phase 2: runner image
- Runner image `runner/Dockerfile` (Ubuntu 26.04): Node.js 24 (also runs TypeScript), Python 3.14, Java 25, .NET 10, GCC 15, Rust 1.99. 3.2 GB. C# compiles with Roslyn directly (`cs-build`) instead of `dotnet build`; `<bits/stdc++.h>` is precompiled.
- Smoke test `runner/smoke/` builds and runs hello world in all 7 languages. Locally in Docker with 2 CPUs: compile C# 1.2 s, C++ 0.8 s, Java 0.6 s, Rust 0.1 s; every run under 100 ms.
- Workflow `runner-image.yml`: on any push that touches `runner/`, builds and smoke-tests the image and pushes it to Vercel Container Registry as `runner:<sha>`; only `main` moves `latest`.
- Open: pushing needs a VCR OIDC policy on the Vercel team and the repository variables `VERCEL_TEAM_ID` and `VERCEL_TEAM_SLUG`; not yet timed in Vercel Sandbox.

### 6 Oct 2026 · Phase 1 done
- CI green on the phase 1 PR and on `main` after the merge, including `problems:check`. Both checks for phase 1 pass.
- HTML and CSS moved from phase 2 to phase 7 (decisions §8, §12).
- Carried into phase 2: memory limits (only the sandbox's own 4 GB today) and our own runner image (still on Vercel's `universal` image).

### 3 Oct 2026 · Phase 1
- Problem format in code: `problems/two-sum/` (statement, hints, examples, 10 hand-written and 4 generated hidden tests, references in JS and Python, wrong and slow solutions).
- Judge in `convex/judge/`: starter-code and driver generators for JavaScript and Python, the runner harness, checkers (`exact`, `float`, `unordered`), verdicts.
- `npm run problems:check` (references accepted, wrong rejected, slow time out) runs locally and in CI; `npm run problems:seed` uploads through Convex storage. Two Sum is seeded on dev.
- Convex: `submissions` table, `submissions.create` / `get`, the `judging.judge` action with the Vercel Sandbox runner; hidden tests stored as one file per problem version.
- Basic solve view at `/solve/[slug]`: statement, Monaco, Run and Submit, live verdicts.
- 54 tests: drivers round-trip every signature type in both languages; the full submit flow runs in Convex tests against the local runner.
- Vercel project `ninjathons` linked (no deployment yet); token, team and project IDs set in Convex dev.
- Real sandbox runs on Two Sum, both languages, all verdict kinds correct: Run 1.2 s, Submit 2.1–2.7 s. Got there by saving the verdict before stopping the sandbox, gzipping the job and using iad1 (details in decisions §5).
- Warm-up problem `add-two-integers` (its wrong solution overflows 32-bit ints) and a problem list on the dashboard linking to `/solve/<slug>`.
- First hands-on test of the solve view: errors now show only the user's own code (`solution.js:2`, `File "solution.py", line 2`), without Node internals, the driver or temp paths, and Run stops at the first crash or timeout instead of repeating it on every example.
- Open: memory limits aren't enforced (only the sandbox's own 4 GB).

### 3 Oct 2026 · Phase 0
- Phased build plan written into the roadmap and decisions §12; this progress file added.
- Ninjathons brand: full logo and neon green accent.
- Tests (Vitest), CI and `.env.example`.
- Decisions recorded: usernames, Stripe, hybrid judging, data deletion, Vercel Sandbox runner, brand, problem file format, launch languages, docs in ranked, Pro price, V2 modes.
- User row created on sign-in; lint bypass closed.

### 2 Oct 2026 · Phase 0
- XP awarding (`convex/lib/xp.ts`) and the progression schema.

### 27 Sept – 1 Oct 2026 · Phase 0
- Next.js app, Convex and Clerk set up and connected; route protection.
- Convex schema and user functions.
- Project documents (roadmap, plan, architecture) and design system notes.
