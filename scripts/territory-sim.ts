/**
 * npm run territory:sim [players] [--ranked] [--keep]
 * npm run territory:sim [bots] --join <code> [--pace <seconds>]
 *
 * Plays one whole Territory game on the Convex dev deployment with bots
 * (convex/territorySim.ts): bot accounts in a lobby, started like a host's
 * Start, then each bot takes regions by sending its problem's reference
 * solution, or now and then a wrong one, judged in the real Vercel Sandbox
 * (each Submit is one sandbox; Hobby has 5,000 a month). Bots aim for the
 * most valuable region they can take, so they often race for the same one.
 *
 * Passes when the game finishes by the rules with every bot placed. Then the
 * bots and their games are removed, unless --keep (remove later with
 * `npx convex run territorySim:teardown`). Default: 3 players, unranked.
 *
 * With --join, the bots (default 2) take seats in a lobby you opened, keep
 * them alive, and play once you start it from the lobby page. They wait
 * about --pace seconds between Submits (default 60), so a person has a
 * chance. They stay afterwards so you can look at the result; the teardown
 * removes them but keeps your games.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

import { buildMap, checkTake, type Level } from "../convex/lib/territoryMap";
import { PROBLEMS_DIR, readSolutions, type Solution } from "./lib/problems";

const CONVEX_CLI = join("node_modules", "convex", "bin", "main.js");
const SUBMIT_COOLDOWN_MS = 10_000;
// Share of Submits that send a wrong solution, so the feed sees failures too.
const WRONG_SHARE = 0.2;

type State = {
  status: string;
  reason?: string;
  timeUp: boolean;
  startsAt: number;
  endsAt: number;
  winningPoints: number;
  now: number;
  regions: { owner?: string; shieldUntil?: number }[];
  players: {
    userId: string;
    username: string;
    language: string;
    points: number;
    regions: number;
    submits: number;
    place?: number;
    lastSubmitAt?: number;
    busy: boolean;
    cards: Record<Level, string | null>;
  }[];
};

function convex(fn: string, args: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CONVEX_CLI, "run", fn, JSON.stringify(args)]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error((stderr || stdout).trim().split("\n").slice(-3).join(" ")));
      resolve(stdout.trim() ? JSON.parse(stdout) : null);
    });
  });
}

const solutions = new Map<string, Solution[]>();
function solutionFor(slug: string, language: string, wrong: boolean) {
  if (!solutions.has(slug)) solutions.set(slug, readSolutions(join(PROBLEMS_DIR, slug)));
  const all = solutions.get(slug)!;
  const kind = wrong ? "wrong" : "reference";
  return (
    all.find((s) => s.kind === kind && s.language === language) ??
    all.find((s) => s.kind === kind) ??
    all.find((s) => s.kind === "reference")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const flags = process.argv.slice(2);
  const option = (name: string) => {
    const i = flags.indexOf(name);
    return i >= 0 ? flags[i + 1] : undefined;
  };
  const code = option("--join");
  const values = new Set([code, option("--pace")]);
  const count = flags.find((a) => !a.startsWith("--") && !values.has(a));
  const players = Number(count ?? (code ? 2 : 3));
  const ranked = flags.includes("--ranked");
  const keep = flags.includes("--keep") || code !== undefined;
  const paceMs = Number(option("--pace") ?? (code ? 60 : 0)) * 1000;

  let gameId: string;
  let botIds: string[];
  if (code) {
    console.log(`Seating ${players} bots in lobby ${code}…`);
    botIds = ((await convex("territorySim:joinLobby", { code, players })) as { userIds: string[] }).userIds;
    console.log("Bots are in. Start the game from the lobby page when you're ready.");
    while (true) {
      const lobby = (await convex("territorySim:lobbyHeartbeat", { code, userIds: botIds })) as {
        status: string;
        gameId: string | null;
      };
      if (lobby.gameId) {
        gameId = lobby.gameId;
        break;
      }
      if (lobby.status !== "open") throw new Error(`the lobby is ${lobby.status}`);
      await sleep(8_000);
    }
  } else {
    console.log(`Setting up ${players} bots (${ranked ? "ranked" : "unranked"})…`);
    const setup = (await convex("territorySim:setup", { players, ranked })) as { gameId: string; userIds: string[] };
    gameId = setup.gameId;
    botIds = setup.userIds;
  }
  console.log(`Game ${gameId}`);
  // Each bot's next move, after its thinking time.
  const nextMoveAt = new Map<string, number>();
  const started = Date.now();
  let submits = 0;
  let wrong = 0;
  let refused = 0;
  let state: State | null = null;
  let map: ReturnType<typeof buildMap> | null = null;

  while (true) {
    state = (await convex("territorySim:state", { gameId })) as State;
    if (state.status === "finished" || state.status === "cancelled") break;
    if (state.status === "countdown") {
      await sleep(Math.max(500, state.startsAt - state.now));
      continue;
    }
    const board = (map ??= buildMap(state.players.length));
    const moves: Promise<void>[] = [];
    for (const bot of state.players) {
      if (!botIds.includes(bot.userId) || state.timeUp || bot.busy) continue;
      if (bot.lastSubmitAt && state.now - bot.lastSubmitAt < SUBMIT_COOLDOWN_MS) continue;
      if (!nextMoveAt.has(bot.userId)) nextMoveAt.set(bot.userId, Date.now() + paceMs * Math.random());
      if (Date.now() < nextMoveAt.get(bot.userId)!) continue;
      const options = board
        .map((region) => ({ region, take: checkTake(board, state!.regions, bot.userId, region.index, state!.now) }))
        .filter((o) => o.take.ok && bot.cards[(o.take as { level: Level }).level])
        .sort((a, b) => b.region.value - a.region.value || Math.random() - 0.5);
      const choice = options[0];
      if (!choice || !choice.take.ok) continue;
      const slug = bot.cards[choice.take.level]!;
      const sendWrong = Math.random() < WRONG_SHARE;
      const solution = solutionFor(slug, bot.language, sendWrong);
      if (!solution) continue;
      submits++;
      nextMoveAt.set(bot.userId, Date.now() + paceMs * (0.5 + Math.random()));
      if (sendWrong && solution.kind === "wrong") wrong++;
      moves.push(
        convex("territorySim:submit", {
          gameId,
          userId: bot.userId,
          region: choice.region.index,
          slug,
          language: solution.language,
          source: solution.source,
        }).then(
          () => {},
          (e: Error) => {
            // A region taken between the read and the Submit: the server refused it, as it should.
            refused++;
            console.log(`  refused for @${bot.username}: ${e.message.slice(0, 120)}`);
          },
        ),
      );
    }
    await Promise.all(moves);
    const line = state.players.map((p) => `@${p.username} ${p.points}`).join(" · ");
    process.stdout.write(`\r${Math.round((Date.now() - started) / 1000)} s · ${submits} submits · ${line}   `);
    await sleep(1_000);
  }

  console.log(`\n\nGame ${state.status}${state.reason ? ` (${state.reason})` : ""} in ${Math.round((Date.now() - started) / 1000)} s.`);
  console.log(`Submits sent: ${submits} (${wrong} wrong on purpose), refused before judging: ${refused}.`);
  for (const p of [...state.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99))) {
    console.log(`  ${p.place ?? "-"}. @${p.username}: ${p.points} points, ${p.regions} regions, ${p.submits} submits`);
  }
  const ok =
    state.status === "finished" &&
    state.players.every((p) => p.place !== undefined) &&
    (state.reason !== "majority" || state.players.some((p) => p.points >= state!.winningPoints));
  console.log(ok ? "\nPASS: the game finished by the rules." : "\nFAIL: the game didn't finish as it should.");

  if (!keep) {
    await convex("territorySim:teardown", {});
    console.log("Bots and their games removed.");
  } else {
    console.log("Bots kept. Remove them with: npx convex run territorySim:teardown");
  }
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
