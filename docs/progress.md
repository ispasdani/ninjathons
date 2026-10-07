# Progress

Where the build stands against the phases in the roadmap (Build order) and [decisions §12](notes/decisions.md#12-build-plan-phases). Update this file in the same commit as the work: change the phase table when a phase starts or finishes, and add a log entry, newest first.

**Now:** Phase 4, 1v1 and private alpha: the match engine, matchmaking, the duel screen, challenges, ghost races and share cards are built, a misnamed function gets a clear error, the runner is faster and isolated, and the load test passed (on Hobby). **Next step:** real matches by hand with two accounts, then invite 10 to 20 friends.

## Phases

| # | Phase | Status | Started | Finished |
|---|---|---|---|---|
| 0 | Setup | Done | 27 Sept 2026 | 3 Oct 2026 |
| 1 | Judging core | Done | 3 Oct 2026 | 6 Oct 2026 |
| 2 | Foundation | Done | 6 Oct 2026 | 6 Oct 2026 |
| 3 | Progression engine | Done | 7 Oct 2026 | 7 Oct 2026 |
| 4 | 1v1 and private alpha | In progress | 7 Oct 2026 | |
| 5 | Daily and weekly challenges | Not started | | |
| 6 | Territory | Not started | | |
| 7 | Learn | Not started | | |
| 8 | Profiles and Pro | Not started | | |
| 9 | Ninjathons | Not started | | |
| 10 | Closed beta and launch | Not started | | |

Content track: 30 of 150–200 problems, 0 of ~20 tutorials, 0 of 3 roadmaps, 0 of 6 weekly sets.

## Log

Each entry: date, phase, what was done, and anything left open. One entry per piece of work, not per commit.

### 7 Oct 2026 · Phase 4: load test passed on Hobby
- The alpha stays on Vercel's Hobby plan; the load test counts as passed there: every verdict right at every load, at most ~40 judgings a minute before players wait ([decisions §5](notes/decisions.md#5-code-runner-vercel-sandbox)). Move to Pro if alpha players often wait, if the month's 5,000 sandboxes run low, and before launch.
- "Waiting for a free runner…": while a sandbox waits for Vercel's limit, the submission says so (`submissions.waitingForRunner`, set by the runner's `onWait`), on the solve view and the duel screen. A match Submit keeps its place in the race, which goes by when it was sent.
- `npm run load:test --local` runs the load test through the local runner (Docker image, or Node.js and Python), free: 20 at once × 2 rounds, 40/40 right, Submit p50 2.4 s and p95 3.3 s.
- 5 new tests (waiting for and retrying a refused sandbox with the SDK faked, 1 vCPU by default, giving up after 90 s; the waiting mark shown and cleared). 371 tests. Deployed to Convex dev.
- Open: the waiting message hasn't been seen in the browser (it needs a real rate limit while signed in).

### 7 Oct 2026 · Phase 4: runner load test
- `npm run load:test [at once] [rounds] [slug]` (`scripts/load-test.ts`): starts judgings together through the dev deployment, all 7 languages, mostly Submits, and reports p50, p95 and errors.
- First run, 20 at once: 9 of 20 failed with Vercel's 429 "vCPUs allocation rate limit exceeded". The Hobby plan allows 20 rising to 40 vCPUs a minute and 10 sandboxes at once ([decisions §5](notes/decisions.md#5-code-runner-vercel-sandbox)).
- Fixes: a refused sandbox waits and retries for up to 90 s instead of failing; sandboxes use 1 vCPU (`SANDBOX_VCPUS`), measured as fast as 2, so twice as many fit in the quota.
- After: 20 at once × 3 rounds, 60/60 right, Submit p50 5.8 s, p95 24.9 s; 10 at once × 3 rounds, 30/30 right, Submit p50 3.8 s, p95 12.6 s. Every verdict right and no errors at any load; above ~40 judgings a minute, verdicts wait for the quota.
- Open: on Hobby, a busy moment (more than ~40 Runs and Submits a minute) makes players wait tens of seconds; Pro (150 rising to 5,000 vCPUs a minute) removes that, and is needed at launch anyway. Players see "Judging…" while waiting; a "waiting for a free runner" message would be clearer.

### 7 Oct 2026 · Phase 4: tests in batches
- Function-mode tests now run many per process: the harness frames them on stdin, each driver (all 7) loops, times the call itself and marks the end of each test's output. Visible examples and hidden tests run in separate processes, so an example can't reach a hidden input. A timer kills a test that runs past its limit; full programs keep one process per test.
- Drives only for hidden inputs of 1 MB or more (`testDrives.bytes`): below that, uploading is faster than a mount.
- Two Sum Submit, start of the day → now: C++ 5.9–6.3 → 4.5–4.6 s, C# 5.2–5.6 → 4.2–4.3 s, Java 4.0–5.0 → 4.1–4.6 s, Rust 4.2–4.5 → 3.4 s, JavaScript 2.5–2.7 → 2.1–2.7 s, Python 2.3–2.9 → 2.0–2.3 s, TypeScript 3.7–3.9 → 2.1–2.3 s ([decisions §5](notes/decisions.md#5-code-runner-vercel-sandbox)).
- 4 new driver tests (batch results and printed output per test, a slow or crashing test mid-batch, examples apart from hidden tests). 366 tests; `problems:check` passes for all 30 problems, slow solutions still time out. Deployed to Convex dev.
- Open: the compiled languages are still above the 3 s target, mostly sandbox start-up (1.5–2 s) and compiling; warm sandboxes are the next lever, a launch decision.

### 7 Oct 2026 · Phase 4: isolated user code, and hidden tests on drives
- Security fix found while measuring: the user's code could read the job file in the sandbox (every test input) and print hidden inputs during a visible example. Now it runs as `nobody` through `setpriv` with every capability dropped (Vercel Sandbox hands all of them to every process), in its own folder, after the harness has deleted the job. Probed in both images: it can't read the harness's files or memory or switch back. The local Docker runner runs jobs the same way; a new test checks it.
- Hidden test inputs on Vercel drives: `testDrives` and `testDrivesFill.fill` (inputs only, both formats, readable only by the harness). The first Submit of a tests file fills its drive in the background; later Submits mount it instead of uploading. On for the compiled languages only (`SANDBOX_TEST_DRIVES`), since a mount slows the managed image's start more than it saves.
- Measured on Two Sum, median Submit with drive / without: C++ 4.24 / 4.46 s, Java 4.06 / 4.91 s, C# 4.75 / 5.29 s, Rust 4.07 / 4.50 s. Before this work (same day): C++ 5.9–6.3 s, C# 5.2–5.6 s, Java 4.0–5.0 s, Rust 4.2–4.5 s.
- 351 tests. Deployed to Convex dev.
- Open: drives of replaced tests files aren't deleted; all tests in one process is the next speed step.

### 7 Oct 2026 · Phase 4: clear error for a misnamed function
- Closes the known gap from phase 2 ([decisions §8](notes/decisions.md#8-launch-languages)). When an error is in the driver and not in the user's lines (a wrong name like `twosum`, wrong parameter types, no class Solution), the verdict is a Compile error: "Your code needs a function named twoSum, with the parameters and return type of the starter code…", then the starter code, then the original error.
- Each language spec gains `entryName` (twoSum, two_sum, TwoSum) and `missingEntry`: an error in `NjMain.java` or `driver.cs` but not the user's file (Java, C#); errors only on lines after the user's code (C++, Rust); the driver's own "not defined" error (JavaScript, TypeScript, Python), reported once as a Compile error instead of a runtime error on every test.
- Errors in the user's own code are left as they are.
- 2 new driver tests, run in all 7 languages through the runner image. 350 tests; `problems:check` passes for all 30 problems.

### 7 Oct 2026 · Phase 4: share cards
- `matches.result`: a finished match's result, public so it can be shared; null while the match is on, so a link can't reveal a live problem. Ratings (as the match left them) and rating changes only for players past their provisional games.
- `/m/[matchId]`: the public result page ("@ada beat @bob in 4:12", the problem, both sides with language, tests, solve time and Submits, then Play a match), with a link preview from `/m/[matchId]/card`: a 1200 × 630 PNG drawn by `lib/share-card.tsx` with `next/og`, dark, in the duel colours. Ghost races and time-up results have their own wording.
- The duel result has Share (the phone's share sheet, or copies the link) and Card (opens the image).
- Checked in the browser: the card for a solved, a ghost and a time-up result (from a temporary sample route, since removed), and the page and card for a bad id (not-found text, 404). 1 new test. Production build passes; 336 tests. Deployed to Convex dev.
- Open: the page with a real match hasn't been seen yet; link previews need the production domain set as `metadataBase` before launch (they use the current host until then).

### 7 Oct 2026 · Phase 4: ghost races
- `convex/lib/ghosts.ts` and `convex/ghosts.ts`: a ghost is a real player's solve from a finished match, as the times and test counts of their Submits. `ghosts.start` makes an unranked match (`source: "ghost"`) with a ghost player row (`matchPlayers.ghost`), and `ghosts.step` replays each Submit at the same moment after the start, so the progress bars, feed, toasts and "earliest send wins" all work as in a live match.
- The pick: someone else's solve of a problem you haven't solved if possible, among the 5 closest to your rating, from the last 200 finished matches. The recorded player isn't in the race (ghost rows never count as their open match). No rating change and no match XP.
- Play offers "Race a ghost" when nobody is waiting, or after 20 s in the queue. The duel screen labels it "Ghost of @name" and "Ghost race · no rating change", with a fainter progress bar; the result says "You beat the ghost" or "The ghost won".
- 3 new tests. Production build passes; 335 tests. Deployed to Convex dev.
- Open: not checked in the browser yet; there are no ghosts on dev until someone wins a real match there. `ghosts.available` reads up to 200 matches, fine for the alpha, to revisit with more players.

### 7 Oct 2026 · Phase 4: challenges
- `challenges` table and `convex/challenges.ts`: challenge by username or make a link (`/challenge/<code>`, the 8-character codes groups use, now in `convex/lib/codes.ts`). Ranked or unranked; unranked may fix the difficulty. Expires after 15 minutes; at most 5 open, one per opponent. Clear errors for an unknown player, yourself, a duplicate.
- Ranked limits: 10 ranked games each and a gap under 400, checked when sent (for a link, the sender only) and again on accept; the daily pair limit applies when the match ends, as for every ranked game.
- Accepting makes the match at once; both players' other sent challenges are cancelled when their match starts.
- `/play` is now Play: language picker, challenges for you (Accept, Decline) and yours (Copy link, Cancel), then Find a match and Challenge someone side by side. `/challenge/[code]` shows the sender, ranked or not, difficulty, expiry, and why you can't accept when you can't.
- A banner under the header on every signed-in page: "You're in a match · Back to it", or "@ada challenges you · See challenge". A match in its countdown opens by itself, so a challenger who wandered off doesn't miss it.
- 7 new tests. Production build passes; 332 tests. Deployed to Convex dev.
- Open: not checked in the browser yet (needs two signed-in accounts).

### 7 Oct 2026 · Phase 4: duel screen
- `/duel/[matchId]`: a countdown card (you vs them, ratings when not provisional, languages, difficulty and time limit, seconds to the start, Leave), then the HUD (server timer, red in the last minute; both progress bars in the duel colours with tests passed and Submits; Give up) over the solve layout, then a result banner (won, lost or draw and why, rating change, match XP, badges, a note when the pair limit stopped the game counting, Find another match).
- The editor opens in the language picked before the match; code is kept per match and language in this browser. Submit shows the 10 s cooldown; Run and Submit stop at time up. No hints in matches.
- Left panel: Description and a Match feed (Submits as tests passed, never code). A toast bottom-right when the opponent submits or gives up.
- `matches.get` takes any string (a bad link shows "not found") and returns the test count for the progress bars. The verdict panel can leave out practice XP, since a match shows its rewards with the result.
- Production build passes; 325 tests. Deployed to Convex dev.
- Open: not checked in the browser yet (needs two signed-in accounts); the client clock isn't corrected against the server's, so a wrong computer clock shows a wrong timer (the server still decides). (The way back to a running match came with challenges: a banner on every page.)

### 7 Oct 2026 · Phase 4: matchmaking
- Find a match: `matchQueue` (one row per player, with language and rating) and a pairing pass (`queue.pass`) that runs as soon as someone joins, then every 2 s while anyone waits. The rating range starts at ±100 and widens by 50 every 5 s; after a minute anyone is a fair opponent. Longest waiting first, closest rating wins.
- The page sends a heartbeat every 10 s; a row not seen for 30 s is dropped, so nobody is matched after closing the tab. A single `matchmaking` row keeps two pass loops from running at once.
- `/play` page: language picker (remembered in this browser), Find a match, waiting time, players waiting, your 1v1 rating, Cancel. "Play" is first in the nav. When matched it opens `/duel/[id]`.
- 10 new tests. Production build passes; 325 tests. Deployed to Convex dev.
- Open: `/duel/[id]` doesn't exist yet (next step), and the page hasn't been checked signed in.

### 7 Oct 2026 · Phase 4: match engine
- Match rules agreed and written down in [decisions §14](notes/decisions.md#14-1v1-matches): difficulty and time limit from the players' average rating, each player's own language, first accepted Submit wins by the time it was sent, best Submit wins at time up, 10 s between Submits.
- Tables `matches`, `matchPlayers` and `matchEvents`; submissions carry `matchId`. `createMatch` in `convex/lib/matches.ts` picks a problem neither player has solved and schedules the start (after a 10 s countdown) and time up on the server clock.
- `matches.get` shows the clock, both players' progress (counts only) and the feed, and the problem only once the match is active; `matches.current` finds your open match; `matches.forfeit` cancels during the countdown and loses after it.
- Results: ranked games within 3 per pair per day change both ratings (`recordDuel`) and give match XP (10, or 25 for a win). 7 new badges: First win, Comeback, and one per rating tier.
- Account deletion removes the player's match rows and feed events.
- 11 new tests, one of them judging real code through the local runner.
- Open: nothing makes matches yet (matchmaking and challenges are the next steps) and there's no duel screen yet. The schema and functions are pushed to Convex dev.

### 7 Oct 2026 · Phase 3 done
- The check passes, by hand in the browser on Convex dev: an accepted Submit showed +10 XP and the First solve badge, a repeat solve explained why there was no XP, and the dashboard and the Level board (Global, Country, Group) updated after the next rebuild.
- Also checked signed in: settings (country set and cleared), creating a group, its page and board, leaving it.
- Fixed while checking: `/groups` and `/groups/[id]` crashed on load, because their signed-in queries ran before Convex had the sign-in token; they (and the Submissions tab) now wait for it. The leaderboard no longer flashes the signed-out message while sign-in loads. Edge has no name for Western Sahara (EH), so it has a fallback.
- Open: solves from before phase 3 gave no XP or badges (only on dev; there are no real users yet).

### 7 Oct 2026 · Phase 3: progression in the app
- Dashboard: level card with the XP bar, your Level board rank, badges earned, groups.
- Solve view: an accepted Submit shows +XP, a new level and new badges; a repeat solve says why there's no XP. Submissions record `levelReached`.
- New pages: `/leaderboards` (Level, This month, 1v1; Global, Country, Group; your row pinned, Jump to me, paging), `/badges` (by area, rarity, yours), `/groups` and `/groups/[id]` (create, join, invite code, members, owner controls, restore), `/settings` (country, or none).
- Header: Leaderboards and Badges links; on phones the nav folds into a menu so the header no longer scrolls sideways at 375 px. Groups and Settings are in the account menu.
- `user.setCountry` (ISO codes, `convex/lib/countries.ts`); a group page or board you can't see returns nothing instead of an error.
- Deployed to Convex dev; the leaderboard cron runs there. Checked in the browser signed out: leaderboards (all scopes), badges, light and dark, phone width. Production build passes; 306 tests.
- Open: the signed-in pages haven't been checked by hand yet.

### 7 Oct 2026 · Phase 3: leaderboards and groups
- Boards: Level (all time and this month) and 1v1 (decisions §13). Scopes: Global and Country from `leaderboardSnapshots`, rebuilt every 5 minutes by a cron (`convex/crons.ts`) page by page; Group computed live for members. `leaderboards.board` returns rows from any rank plus your live position.
- Ties go to whoever got there first; 1v1 shows only players with 10 ranked games who played in the last 30 days. Old snapshot versions and monthly boards older than last month are deleted.
- Groups (`convex/groups.ts`): create, join by invite code, leave, rename, new code, remove members, soft delete with 30-day restore and a daily purge. 100 members, 10 groups per user.
- Account deletion removes monthly XP and snapshot rows, and hands owned groups to the earliest member.
- 18 new tests, including the phase check end to end: a real solve puts the player on both Level boards.
- Open: no country input yet, so the Country scope stays empty until step 6; join attempts by code aren't rate-limited.

### 7 Oct 2026 · Phase 3: ratings
- Glicko-2 in `convex/lib/glicko2.ts`, matching the worked example in Glickman's paper; one rating period per game (decisions §13).
- Tables `ratings` (one row per user and area: `1v1`, `territory`) and `ratingHistory`. `recordDuel` in `convex/lib/ratings.ts` rates both players of a 1v1 game from their ratings before it and keeps wins, losses and draws.
- Tiers from design.md 2.5; provisional until 10 ranked games. `ratings.mine` returns your ratings with tier and record.
- Account deletion removes ratings and history.
- 15 new tests.
- Open: nothing calls `recordDuel` until 1v1 (phase 4), which also adds the ranked-game limits. Territory's OpenSkill comes in phase 6.

### 7 Oct 2026 · Phase 3: badges
- 21 badges from solves and levels (decisions §13): first solve, 10/50/100/500 problems, first hard, 50 in each language, Polyglot, one per title band. Later badges are listed there with their phase.
- `convex/lib/badges.ts`: definitions and rules. Level badges are checked on every XP award, solve badges on every accepted Submit, in the same transaction. The submission records new badges (`badgesEarned`).
- Tables `userBadges` and `badgeCounts`; `badges.list` returns every badge with its rarity (share of players with a solve) and, signed in, when you earned it. Account deletion removes badges and lowers the counts.
- 14 new tests.

### 7 Oct 2026 · Phase 3: levels and titles
- Total XP on the user row (`users.xp`), updated by `awardXp` in the same transaction as the ledger entry.
- `convex/lib/levels.ts`: level from total XP (start at 1; level n + 1 at 100 × n^1.5, so level 2 at 100 XP, 50 at 34,300) and the roadmap's placeholder titles, Initiate to Legend (decisions §13).
- `user.getCurrentUser` returns `progress` (XP, level, title, where this level starts and the next begins) for the XP bar.
- 7 tests: thresholds, title bands, slower levels as you go, the total matching the ledger.

### 7 Oct 2026 · Phase 3: solves award XP
- An accepted Submit writes to the XP ledger: 10 easy, 20 medium, 40 hard (roadmap, XP sources), first solve per problem per language only. Run and failed Submits give nothing.
- Ledger key `solve:<slug>:<language>` (the slug never changes, decisions §7); `awardXp` keeps it to once even on retries.
- The submission row records what it earned (`xpAwarded`), also returned by `submissions.mine`, for the solve view to show later.
- 4 tests in `convex/submissions.test.ts` (first solve, Run and failures, once per language and per user, difficulty).

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
