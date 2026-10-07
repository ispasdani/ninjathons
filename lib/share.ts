import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type MatchResult = NonNullable<FunctionReturnType<typeof api.matches.result>>;
export type ResultPlayer = MatchResult["players"][number];

export const LANGUAGE_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  rust: "Rust",
};

export function playerName(p: ResultPlayer) {
  return p.ghost ? `the ghost of @${p.username}` : `@${p.username}`;
}

export function duration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function modeName(r: MatchResult) {
  if (r.source === "ghost") return "Ghost race";
  return r.ranked ? "Ranked 1v1" : "Unranked 1v1";
}

/** "@ada beat @bob in 4:12", for the card, the page and its title. */
export function headline(r: MatchResult) {
  const winner = r.players.find((p) => p.result === "win");
  const loser = r.players.find((p) => p !== winner);
  if (!winner) {
    const [a, b] = r.players;
    return { title: `${a ? playerName(a) : "?"} and ${b ? playerName(b) : "?"} drew`, detail: "Time ran out level" };
  }
  const title = `${playerName(winner)} beat ${loser ? playerName(loser) : "their opponent"}`;
  if (r.reason === "forfeit") return { title, detail: "by forfeit" };
  if (r.reason === "time") {
    return { title, detail: `on tests at time up, ${winner.bestPassed}/${winner.total || winner.bestPassed}` };
  }
  return { title, detail: winner.solvedInMs === null ? "" : `in ${duration(winner.solvedInMs)}` };
}
