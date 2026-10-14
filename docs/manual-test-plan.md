# Manual test plan: phases 0 to 9

A hands-on pass over everything built so far, run locally against the Convex dev deployment. It focuses on the screens nobody has seen signed in yet (most of them; see the "Open" lines in [progress.md](progress.md)), but covers every phase so one run through this file is a full check.

Tick the boxes as you go. When something is wrong, note it in the format at the bottom and keep going.

## Run status

The current run, started 13 Oct 2026. Tick boxes in the sections below as checks pass, and update this table when a section is finished. To start a new run, clear the ticks and this table.

| Section | Status | Date | Problems found |
|---|---|---|---|
| 1. Sign-up, sign-in, onboarding | Passed | 14 Oct 2026 | 2, fixed: sign-up landed on `/` instead of `/onboarding`; no way to change a username (now in `/settings`) |
| 2. Problems and the solve view | Passed | 14 Oct 2026 | None |
| 3. XP, levels, badges, leaderboards, groups, settings | Passed | 14 Oct 2026 | None |
| 4. 1v1 matches | Not started | | |
| 5. Daily and weekly | Not started | | |
| 6. Territory | Not started | | |
| 7. Learn | Not started | | |
| 8. Profiles and Pro | Not started | | |
| 9. Admin pages hidden | Not started | | |
| 10. A full ninjathon | Not started | | |
| 11. Account deletion | Not started | | |
| 12. Cross-checks | Not started | | |

---

## 0. Before you start

### 0.1 Start the app

Two terminals, from the repo root:

```bash
npx convex dev
```

```bash
npm run dev
```

Open http://localhost:3000. Keep the `npx convex dev` terminal visible: function errors show there.

Also open the **Convex dashboard** (the link `npx convex dev` prints, or https://dashboard.convex.dev → your dev deployment). You'll use:

- **Data**: look at rows (users, submissions, xpLedger, ninjathons…) to confirm what the screen says.
- **Logs**: errors from functions, live.
- **Functions**: run internal functions by hand (or use `npx convex run` below).

### 0.2 Accounts

You need 3 players. Each one needs its **own browser session**, or they'll share the sign-in:

| Who | Where | How |
|---|---|---|
| **A: `dnis`** (admin, your real dev account) | Your normal browser window | Already exists; already has the admin role on dev |
| **B** | A private/incognito window | Sign up with `yourname+clerk_test1@example.com`, code **424242** |
| **C** | A second browser (e.g. Edge if you use Chrome), or a second Chrome profile | Sign up with `yourname+clerk_test2@example.com`, code **424242** |

Clerk's development instance accepts any `+clerk_test` email with the code 424242, no real email is sent. Two private windows of the same browser share cookies, so use a different browser or profile for C.

Optional **D** (only for the account deletion test at the very end): `yourname+clerk_test3@example.com`.

### 0.3 Commands you'll use while testing

Run them from Git Bash. In Windows PowerShell 5.1 the double quotes inside the JSON get stripped; there, escape them: `'{\"username\": \"dnis\", \"admin\": true}'`.

```bash
npx convex run leaderboards:rebuildAll
```
Rebuilds every leaderboard now instead of waiting up to 5 minutes. Run it whenever a board should have changed.

```bash
npx convex run admin:setRole '{"username": "dnis", "admin": true}'
```
Gives (or with `false`, takes away) the admin role. `dnis` already has it.

```bash
npx convex run daily:pick
```
Picks today's daily if none exists yet (it runs hourly anyway).

```bash
npm run territory:sim -- 2 --join <lobbyCode>
```
Puts 2 bots in a Territory lobby you opened, if you don't have 3 real players at hand.

### 0.4 What to look at on every page

Do these on every page you visit, not just the ones listed:

- [ ] No red errors in the browser console (F12 → Console).
- [ ] No errors in the `npx convex dev` terminal or the dashboard Logs.
- [ ] Dark and light both readable (theme toggle in the header).
- [ ] At phone width (F12 → device toolbar → iPhone, 375 px) nothing scrolls sideways and nothing is cut off.
- [ ] Error messages are in plain words, never a raw code like `TEAM_FULL` or a stack trace.

Known issue, don't re-report: **the signed-out header overflows sideways at about 800 to 850 px wide.**

### 0.5 Time plan

The ninjathon (section 10) runs on the real clock: an event lasts **at least 1 hour** and must be published before it starts. So:

1. Do **10.1 to 10.3** first (create the event, register teams), with the start about 15 minutes away.
2. Do sections 1 to 9 while it runs, coming back to hand in projects (10.4).
3. After the end, judge and publish (10.5 to 10.7).

Daily and weekly results, streak settling and the weekly top 10% badge also follow the UTC clock; the plan notes where.

---

## 1. Phases 0 and 2: sign-up, sign-in, onboarding

Use player **B**'s window (fresh account).

### 1.1 Signed out
- [x] `/` (home) loads signed out.
- [x] `/dashboard` signed out sends you to sign-in.
- [x] Public pages open signed out: `/problems`, `/daily`, `/weekly`, `/leaderboards`, `/badges`, `/learn`, `/roadmaps/programming-basics`, `/ninjathons`, `/pro`, `/u/dnis`.

### 1.2 Sign up and pick a username
- [x] Sign up as B (test email, code 424242).
- [x] You land on `/onboarding`, not the dashboard.
- [x] Try bad usernames, each refused with a clear reason as you type:
  - [x] `ab` (too short), a 21-character name (too long)
  - [x] `1abc` (must start with a letter), `ab cd`, `ab.cd` (bad characters)
  - [x] `admin`, `settings`, `play`, `ninjathons` (reserved)
  - [x] `DNIS` (taken, case-insensitive)
- [x] A good name (e.g. `tester_b`) shows as available and saves.
- [x] You're sent back to where you were going; the dashboard shows `@tester_b`.
- [x] Try visiting `/play` directly before picking a name (new account C): you're sent to onboarding first.

### 1.3 Username change rules (on A or B, in `/settings` → Username)
- [x] The field shows your current name; Save stays disabled until you type a different one, and the hints match onboarding's.
- [x] Changing only the letter case (`tester_b` → `Tester_B`) is allowed straight away.
- [x] Changing to a different name right after the first pick: check the rule message (30-day cooldown after a real change).
- [x] After a real change, `/u/<old name>` redirects to `/u/<new name>` (308 in the Network tab).

### 1.4 Sign out and back in
- [x] Sign out from the account menu, sign back in: the username and progress are still there.

---

## 2. Phases 1 and 2: problems and the solve view

Use **A**. Note: every Run and Submit uses the real Vercel Sandbox (Hobby: about 40 judgings a minute, 5,000 sandboxes a month), so don't spam.

### 2.1 Problem library (`/problems`)
- [x] All problems listed (88 minus the weekly sets not yet started).
- [x] Search by name works (`two sum`).
- [x] Filters: difficulty, type (function / stdio / HTML & CSS), topic.
- [x] Signed in: the status filter (solved, attempted) and your solved progress count.
- [x] Problems from weekly sets 2 to 6 (e.g. "Integer Square Root", "House Robber") are **not** listed.
- [x] Phone width: the list and filters fit.

### 2.2 Solve view (`/solve/two-sum`)
- [x] Description tab: statement, examples, constraints, hints.
- [x] The split between description and editor drags; arrow keys move it when focused; the size is remembered after reload.
- [x] Editor theme follows light/dark.
- [x] Language picker: all 7 (JavaScript, TypeScript, Python, Java, C#, C++, Rust), each with its own starter code.
- [x] Type something, reload: your draft is still there (per problem and language).

### 2.3 Verdicts (JavaScript or Python is fastest)
For each, check the verdict text and that the error only points at **your** code (e.g. `solution.js:2`), no driver files or temp paths.
- [x] **Run** with a correct solution: examples pass.
- [x] **Submit** correct: **Accepted**, with tests passed and time.
- [x] **Wrong answer**: shows which test, expected vs got (for visible examples).
- [x] **Runtime error**: `throw new Error("x")` → error with your line number.
- [x] **Time limit**: `while(true){}` → Time limit exceeded.
- [x] **Memory limit**: allocate a huge array in a loop → Memory limit exceeded.
- [x] **Compile error** (Java, C++ or Rust): a syntax error shows the compiler message on your line.
- [x] **Misnamed function**: rename `twoSum` to `twosum` → a compile error saying the function must be named `twoSum`, with the starter code.
- [x] Run stops at the first crash instead of repeating it for every example.

### 2.4 Other languages
- [x] Submit an accepted Two Sum in at least one compiled language (C++ or Java). It's slower (about 4 s); you should see "Judging…".
- [x] A **stdio** problem (`/solve/sum-of-a-list`): the starter is a full program reading input; Submit a correct one.

### 2.5 Submissions tab
- [x] Lists your Runs/Submits with verdicts.
- [x] Opening one loads its code into the editor.

---

## 3. Phase 3: XP, levels, badges, leaderboards, groups, settings

### 3.1 XP and badges from solving (use **B**, fresh account)
- [x] First accepted Submit on an Easy problem: **+10 XP** and the **First solve** badge shown in the solve view.
- [x] Submit the same problem again in the same language: no XP, and it says why (already solved).
- [x] Same problem in a **different** language: +10 XP again.
- [x] A Medium gives +20, a Hard +40.
- [x] A failed Submit or a Run gives nothing.
- [x] Reaching 100 XP shows **level 2** in the solve view.

### 3.2 Dashboard (`/dashboard`)
- [x] Level card: level, title, XP bar that matches your XP.
- [x] Badges earned, groups, Daily and Weekly cards, progress and "carry on".

### 3.3 Badges page (`/badges`)
- [x] Every badge grouped by area, with rarity.
- [x] Your earned ones are marked with the date.
- [x] Signed out: still loads, nothing marked.

### 3.4 Settings (`/settings`)
- [x] Set a country; clear it again (no country).
- [x] Links to Profile, Plan (Pro), Groups.

### 3.5 Leaderboards (`/leaderboards`)
Run `npx convex run leaderboards:rebuildAll` after solving, then reload.
- [x] Tabs: Level, This month, 1v1, Territory, Daily, Weekly, Learning, Learning this month, Ninjathons.
- [x] Scopes: Global, Country (only once you've set a country), Group.
- [x] Your row is pinned; "Jump to me" scrolls to it; paging works.
- [x] B shows up on Level after the rebuild, with the right XP.
- [x] 1v1 and Territory boards only show players with 10+ ranked games (likely empty).

### 3.6 Groups (`/groups`) with **A** and **B**
- [x] A creates a group; its page shows the 8-character invite code.
- [x] B joins with the code (try it lower-case too: codes ignore case).
- [x] A wrong code is refused clearly.
- [x] The group's board lists both members, 0 XP included.
- [x] A renames the group; B sees the new name.
- [x] A makes a new code: the old one stops working (try joining with it as C).
- [x] A removes B; B no longer sees the group.
- [x] A deletes the group, then **Restore** brings it back.
- [x] B (re-joined) leaves; if A leaves, ownership passes to the earliest member.

---

## 4. Phase 4: 1v1 matches (needs **A** and **B** at the same time)

### 4.1 Find a match (`/play`)
- [ ] Language picker remembers your choice after reload.
- [ ] A clicks **Find a match**: waiting time and players waiting tick.
- [ ] B clicks Find a match: both are paired within a few seconds and sent to `/duel/<id>`.
- [ ] **Cancel** while waiting takes you out of the queue.

### 4.2 Duel screen
- [ ] Countdown card: both players, languages, difficulty, time limit, 10-second countdown. The problem is **hidden** during it.
- [ ] After the countdown: the problem, the server timer, both progress bars.
- [ ] B submits a wrong answer: A sees a toast and B's bar move (counts only, never code); the Match feed logs it.
- [ ] Submit twice quickly: the 10-second cooldown shows.
- [ ] Docs tab (JavaScript or Python): search and open a page.
- [ ] A submits a correct solution: result banner for both (won / lost), rating change hidden while provisional, match XP (25 win / 10 loss for ranked), badges (**First win**).
- [ ] The result says "used N doc pages" if docs were opened.

### 4.3 Other endings (new matches)
- [ ] **Leave during the countdown**: match cancelled, no result.
- [ ] **Give up** after the start: the giver loses.
- [ ] (Optional, long) Let a match run to **time up**: the best Submit wins, or a draw.

### 4.4 Getting back to a match
- [ ] During a match, go to another page: the banner "You're in a match · Back to it" appears and works.

### 4.5 Challenges
- [ ] A challenges B **by username** (Unranked, pick a difficulty).
- [ ] B sees the banner "@dnis challenges you" on any page, and the challenge on `/play`.
- [ ] B **declines**: it disappears for both.
- [ ] A makes a **link** challenge; copy it, open it as C: sender, ranked or not, difficulty, expiry.
- [ ] A opening their own link can't accept it.
- [ ] C accepts: the match starts at once for both.
- [ ] Refusals: challenge yourself, an unknown username, a second challenge to the same person.
- [ ] A **Ranked** challenge is refused while players have under 10 ranked games (clear reason).
- [ ] Cancel an open challenge from `/play`.

### 4.6 Share page
- [ ] After a finished match, **Share** copies the link to `/m/<matchId>`.
- [ ] Open it signed out (private window): "@x beat @y in m:ss", problem, both sides; no code.
- [ ] **Card** opens the 1200×630 image.
- [ ] `/m/nonsense` shows "not found".

### 4.7 Ghost race
Only possible once a real ranked match has been won on dev.
- [ ] On `/play`, alone in the queue for 20 s (or nobody waiting): "Race a ghost" appears.
- [ ] The race is labelled "Ghost of @name", "no rating change"; the ghost's bar moves on its own.
- [ ] The result says "You beat the ghost" / "The ghost won"; no rating change, no match XP.

---

## 5. Phase 5: daily and weekly challenges

### 5.1 Daily (`/daily`), with **B**
- [ ] Today's problem, difficulty fitting the weekday (Mon/Tue Easy, Wed–Fri Medium, Sat/Sun Hard), time to the next one.
- [ ] Solve opens the solve view with a **Daily chip** and a running clock.
- [ ] Accepted Submit: "+30 XP · Daily solved · 1-day streak".
- [ ] Back on `/daily`: your solve time, streak 1, best, total, and you in Today's fastest.
- [ ] Dashboard Daily card shows the streak.
- [ ] Next UTC day (optional): solve again → +35 XP, streak 2.

### 5.2 Weekly (`/weekly`)
Set 1, **Running Totals**, should have started on Monday 12 Oct 00:00 UTC. If the page says there's no set this week, check the dashboard Logs for `weekly.start`.
- [ ] Title, theme text, time left, 4 problems with difficulty and points (100/200/400).
- [ ] Solve one: the chip says "Weekly · n pts" with a clock.
- [ ] Accepted Submit: "Weekly · +n points", +25 XP.
- [ ] Your week: points, a bar, solved count, total time.
- [ ] Those 4 problems are now in the library; sets 2 to 6's are still hidden.
- [ ] Weekly board (after a rebuild) lists you by points, then time.
- [ ] (Monday 19 Oct) Last week settles and the top 10% badge is given.

---

## 6. Phase 6: Territory (needs 3 players: **A**, **B**, **C**, or A plus bots)

### 6.1 Lobby
- [ ] `/play` → Territory switch (`/play/territory`): Find a match, Open a lobby (Ranked/Unranked, anyone with the link or a group).
- [ ] A opens an **Unranked** lobby: `/lobby/<code>` with the link, players and languages.
- [ ] B and C join through the link, each picking a language.
- [ ] Start is disabled (or refused) with fewer than 3 players.
- [ ] A starts with 3 players: everyone goes to `/territory/<id>`.
- [ ] Alone? Run `npm run territory:sim -- 2 --join <code>` and start with the 2 bots.
- [ ] A **group lobby** shows on the group page, and only members can join.
- [ ] The host leaving closes the lobby.

### 6.2 The game
- [ ] Countdown: players, ratings, languages, map size (37 regions for 3–4 players).
- [ ] HUD: server timer, score bar with the winning marker (33 of 65), everyone's points, Give up.
- [ ] Your home base corner is yours. Regions next to yours are dashed (takeable).
- [ ] Clicking a region says whether you can take it and why, and shows the problem that would.
- [ ] Clicking a region not next to yours: says you can't.
- [ ] Solve and Submit: the region becomes yours in your colour with your initials, then a **lock** for 60 s (shield).
- [ ] **Skip** moves to the next problem of that difficulty.
- [ ] Two players racing for the same region: the earlier **sent** Submit wins; the later one says "too late" and keeps its problem.
- [ ] The game feed logs captures.
- [ ] Docs tab works in the game.
- [ ] Give up: that player places last; their regions stay and can be attacked.
- [ ] The end (majority, 30 minutes, or one player left): placement, standings, XP (none for unranked), badges.

### 6.3 After
- [ ] Recent games on each player's profile lists the game.
- [ ] Teardown after bots: run the sim's teardown if it didn't clean up (it says so in its output).

This is also **phase 6's own check** (3 to 6 real players finishing a game by hand). If you do it with 3 real accounts, it counts.

---

## 7. Phase 7: Learn

### 7.1 Learn page and roadmaps
- [ ] `/learn`: 3 roadmaps with your progress, and 20 tutorials.
- [ ] `/roadmaps/programming-basics`: 5 modules as a path; the first ("First steps") marked free; the others tagged **Pro** with a lock on each lesson (tutorials inside them stay open).
- [ ] Signed out, a tutorial (e.g. `/learn/hash-maps-and-sets`) is readable in full.

### 7.2 Finishing a lesson (use **B**, not Pro)
- [ ] Open `/learn/pb-values-and-variables` signed in: the text, 2 exercises (Add Two Integers, Seconds to Minutes) with Solve buttons, the place in the roadmap, previous/next.
- [ ] Solve both exercises (Solve button → solve view). After the second accepted Submit, the rewards line names the **lesson finished: +15 XP** and the **First lesson** badge.
- [ ] Open `/learn/pb-making-decisions` and solve both (Fizz Buzz, Grade Letter): the module **First steps** finishes, **+100 XP**.
- [ ] The roadmap page fills in those nodes.
- [ ] A lesson whose exercises you'd already solved finishes just by opening it.
- [ ] Learning board (after a rebuild) shows B's learning XP.

### 7.3 The Pro lock (B is free)
- [ ] `/learn/pb-loops`: a Pro panel instead of the text; outline and exercises still shown; a link to `/pro`.
- [ ] View the page source (Ctrl+U): the lesson text is **not** in the HTML.
- [ ] `/learn/hash-maps-and-sets` (a tutorial inside a Pro module) is open.

### 7.4 HTML and CSS challenges
- [ ] `/solve/html-shopping-list`: HTML tab editable, CSS tab read-only marked "given".
- [ ] Your page and the target side by side; the **overlay** toggle lays them over each other.
- [ ] **Run** on the starter: checks list with failures, each naming the first difference.
- [ ] Fix it until **Submit** is Accepted: solve XP, counts for lessons.
- [ ] `/solve/css-profile-card`: checks run at 800 and 320 px.
- [ ] The Docs tab shows HTML and CSS pages.

### 7.5 Docs library
- [ ] In the solve view (JavaScript): Docs tab, search `map`, open `Array.prototype.map()`.
- [ ] A link inside it opens in the panel; a link to a page not in the library opens MDN in a new tab.
- [ ] Each page ends with its license line and source.
- [ ] Python: search `heapq`.
- [ ] Java/C#/C++/Rust: says references come later.

---

## 8. Phase 8: profiles and Pro

### 8.1 Profile page
- [ ] `/u/dnis` signed out: header (avatar, name, username, level, title, country, join month), stats block, activity grid, badges, recent games.
- [ ] Stats block: 1v1 and Territory show "placement games left" while provisional.
- [ ] The activity grid opens at this week on a phone and has a hover readout.
- [ ] `/u/nobody_here` → 404.
- [ ] **Never** shown: email, groups, unpinned code.
- [ ] `/dnis` (the short URL) redirects to `/u/dnis` while not Pro.

### 8.2 Profile editor (`/settings/profile`, as **B**)
- [ ] The right side previews the profile live as you type.
- [ ] Bio: 160-character limit; save; shows on `/u/<b>`.
- [ ] Links: `http://…` refused, `https://github.com/x` accepted and shown as `github.com`. Up to 4.
- [ ] Favourite languages: up to 3.
- [ ] Themes: the 3 free ones save; earned ones locked with what unlocks them; Pro ones preview but **Save** keeps the free parts and says the rest needs Pro.
- [ ] Pro options (accent, banner, heading font, section order) preview for B but don't save; an accent with poor contrast is refused.
- [ ] **Pins**: pin an accepted Submit (code becomes public on the profile); unpin hides it. Today's daily problem can't be pinned.
- [ ] Dark mode on the profile.

### 8.3 Buying Pro (as **B**, Stripe test mode)
- [ ] `/pro` signed out: "Sign in to get Pro", prices €8/month and €69/year, the toggle.
- [ ] As B: **Get Pro** → Stripe Checkout (test mode). Pay with card **4242 4242 4242 4242**, any future date, any CVC, any name.
- [ ] Back on `/pro?checkout=success`: "payment is in", then a welcome once the webhook lands (a few seconds).
- [ ] Dashboard Data: `entitlements` has a row for B.
- [ ] `/pro` now shows the renewal date and **Manage billing** → Stripe's portal opens.
- [ ] Cancel from **Checkout's back link** (a separate try): `?checkout=cancelled` says nothing was charged.

### 8.4 With Pro (B)
- [ ] `/learn/pb-loops` now shows the text; finishing it works.
- [ ] Profile editor: Pro theme, accent, banner, font, section order save and show on `/u/<b>`.
- [ ] `/<b's username>` shows the profile directly.
- [ ] Get Pro again: refused ("already Pro").

### 8.5 Ending Pro
- [ ] Manage billing → cancel the subscription **immediately** if the portal offers it, or cancel it in the Stripe dashboard (test mode).
- [ ] B's profile falls back to the last free theme; Pro values hidden but kept (go Pro again → they're back).
- [ ] `/learn/pb-loops` locked again.

---

## 9. Phase 9 prep: the admin pages are hidden

- [ ] Signed out: `/admin/ninjathons` → **404** (not a sign-in page).
- [ ] As **B** (not admin): `/admin/ninjathons` → 404.
- [ ] As **A** (`dnis`): the admin event list loads.

---

## 10. Phase 9: a full ninjathon by hand

Start this early (see 0.5). Uses **A** as admin, **B** and **C** as players. A can also play, but keep A as judge only to keep it clear.

### 10.1 Create the event (A, `/admin/ninjathons` → New)
- [ ] Refusals, each with a clear message:
  - [ ] Slug with spaces or capitals, or under 3 characters.
  - [ ] Length under 1 hour or over 7 days.
  - [ ] Team min above max, or max over 6.
  - [ ] 1 rubric criterion, or 7; weights not adding to 100.
- [ ] Create a good one: slug `test-run-1`, start **15 minutes from now**, end **1 hour after the start**, team size 1 to 2, 3 criteria (e.g. Idea 40, Execution 40, Demo 20), a brief with Markdown (a heading, a list, code), prizes for 1st to 3rd.
- [ ] The brief's Markdown preview renders. Times show in your local time zone.
- [ ] It's a **draft**: `/ninjathons` as B doesn't list it; `/ninjathons/test-run-1` as B is not found.
- [ ] Edit something and save; change the slug while still a draft.
- [ ] **Publish**. (Publishing an event whose start is already past is refused.)

### 10.2 The public page before the start
- [ ] `/ninjathons` lists it as **upcoming** (also a tab on `/play`).
- [ ] `/ninjathons/test-run-1` signed out: title, teaser, dates in local time, team size, rubric, prizes. **No brief.**
- [ ] View source (Ctrl+U): the brief's text is **not** in the HTML.
- [ ] Signed out: registering asks you to sign in.
- [ ] As A, the slug can no longer change; other fields still can.

### 10.3 Teams (before the start)
- [ ] B creates a team "Team Bee": B is captain; an 8-character invite code shows.
- [ ] Team names: under 3 or over 32 characters refused; C creating "team bee" refused (taken, ignoring case).
- [ ] C joins with B's code. The team shows 2 of 2.
- [ ] A third account (A, or D) joining the full team: refused (team full).
- [ ] B renames the team; C sees it.
- [ ] B makes a new code: the old one stops working.
- [ ] B removes C, then C rejoins with the new code.
- [ ] C leaves and re-joins (or: B leaves → C becomes captain). Put the team back to B + C.
- [ ] Optional solo entry: D (or A, if A plays) creates a one-person team.
- [ ] Before the start, saving a project is refused.
- [ ] As A, lowering the max team size below a team's current size is refused.

### 10.4 While it runs (after the start time)
Don't reload: the page should switch by itself at the start time.
- [ ] The **brief appears** on its own at the start; the stage shows **running**.
- [ ] Team changes are closed: no join, leave, rename, new code. The invite code is no longer shown.
- [ ] As A, editing the event is refused (cancelling still allowed; don't).
- [ ] B saves the project: name, repo link, demo video link, description.
  - [ ] `http://` links refused; non-links refused.
  - [ ] Description over 1,000 characters refused.
- [ ] C edits the same project: their save replaces B's, showing who saved last and when.
- [ ] The solo team saves its project.
- [ ] B can't see the solo team's project (or any other team's).
- [ ] A team under the minimum (only if min > 1) can't submit.

### 10.5 After the end
- [ ] The page shows the **judging** notice; saving is refused.
- [ ] As A, `/admin/ninjathons` → the event → judging screen lists every submission with links.
- [ ] **Publish results** is refused while a project has no score sheet.

### 10.6 Judging (A)
- [ ] Score each project 0 to 10 on each criterion (buttons), add a private note.
- [ ] Change a score: it updates.
- [ ] (Optional) Disqualify one with a reason: it drops out of the placing.
- [ ] Work out the expected score yourself: Σ(weight × score) ÷ 10. Example: 40×9 + 40×8 + 20×7 = 820 → **82**.
- [ ] Publish results. (It can't be undone; there's no undo button.)

### 10.7 Results
- [ ] `/ninjathons/test-run-1` (signed out too): place, team, members, links (shown by domain), score, average per criterion. **No private notes, no disqualification reason.**
- [ ] XP for B and C: **200 + 1,000 = 1,200** each if 1st; the solo player 200 + 750 = 950 if 2nd. Check the XP bar / dashboard Data `xpLedger` key `ninjathon:<eventId>`.
- [ ] Badges: **Ninjathon participant** for everyone who submitted, **Ninjathon winner** for 1st.
- [ ] Run `npx convex run leaderboards:rebuildAll`; the **Ninjathons** board (Hall of fame) lists them: 1st places, then 2nd · 3rd · events.
- [ ] `/ninjathons` lists the event under past.
- [ ] Cancelling it now is refused (it has results).

### 10.8 Cancelling
- [ ] Create and publish a second event, then **Cancel** it: it disappears from `/ninjathons` and its page is not found.

### 10.9 Clean up
- [ ] In the dashboard Data, delete the test events' rows if you don't want them on dev (or leave them; nothing depends on them).

---

## 11. Account deletion (last, with throwaway **D**)

There's no "Delete account" button yet. Deletion runs from Clerk's `user.deleted` webhook.

- [ ] Give D some history: a username, a solve, a group membership, a ninjathon team if one is open.
- [ ] Delete D in the **Clerk dashboard** (Users → D → Delete).
- [ ] Convex Logs: the deletion runs without errors.
- [ ] `/u/<d>` → 404. D is gone from boards after a rebuild, gone from the group (ownership passed on if D owned it).
- [ ] Matches D played show "Deleted player" for D; the opponent keeps their result.
- [ ] D's old username can't be taken by someone else (held 90 days).

---

## 12. Cross-checks at the end

- [ ] `npm run test:once`: all pass (553). The two runner tests judging real Python can time out under the full run; they pass alone.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- [ ] Walk the main pages once more at 375 px and in dark mode.

---

## Reporting a problem

One entry per problem, so each can be fixed and checked on its own:

```
Section: 10.4
Account: B (tester_b), Chrome private window, 1280px, dark mode
Did: saved the project with a GitHub link, then reloaded
Expected: the link shown as github.com
Got: the field was empty after reload
Console / Convex log: (paste any error)
Screenshot: (attach)
```
