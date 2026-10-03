# Progress

Where the build stands against the phases in the roadmap (Build order) and [decisions §12](notes/decisions.md#12-build-plan-phases). Update this file in the same commit as the work: change the phase table when a phase starts or finishes, and add a log entry, newest first.

**Now:** Phase 1, Judging core: the 3-second target is met. **Next step:** get CI green on the branch, then mark phase 1 done and start phase 2.

## Phases

| # | Phase | Status | Started | Finished |
|---|---|---|---|---|
| 0 | Setup | Done | 27 Sept 2026 | 3 Oct 2026 |
| 1 | Judging core | In progress | 3 Oct 2026 | |
| 2 | Foundation | Not started | | |
| 3 | Progression engine | Not started | | |
| 4 | 1v1 and private alpha | Not started | | |
| 5 | Daily and weekly challenges | Not started | | |
| 6 | Territory | Not started | | |
| 7 | Learn | Not started | | |
| 8 | Profiles and Pro | Not started | | |
| 9 | Ninjathons | Not started | | |
| 10 | Closed beta and launch | Not started | | |

Content track: 2 of 150–200 problems (two-sum, add-two-integers), 0 of ~20 tutorials, 0 of 3 roadmaps, 0 of 6 weekly sets.

## Log

Each entry: date, phase, what was done, and anything left open. One entry per piece of work, not per commit.

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
- Open: CI hasn't run on the branch yet; memory limits aren't enforced (only the sandbox's own 4 GB).

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
