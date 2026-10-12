"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { HexMap, type MapPlayer, type PlayerColor } from "@/components/territory/hex-map";
import { Button } from "@/components/ui/button";
import { buildMap, neighbours, totalPoints, winningPoints } from "@/convex/lib/territoryMap";
import { cn } from "@/lib/utils";
import { WIN, WindowCard } from "./window-card";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
// The panel sits inside a window (window-card.tsx), which draws the frame.
const panel = "flex min-h-[468px] min-w-0 flex-col p-4 sm:p-6";

// Same file names and colours as the 1v1 and Territory windows under Modes.
const TABS = [
  { id: "duel", label: "1v1 race", file: "race_1v1.exe", color: "pink" },
  { id: "territory", label: "Territory", file: "territory.exe", color: "green" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const TICK_MS = 250;
const TAB_MS = 8000;
const PAUSE_MS = 30_000;

const MOTION = "(prefers-reduced-motion: reduce)";
const reducedMotion = () => window.matchMedia(MOTION).matches;
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function clock(secs: number) {
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

/**
 * The hero's live example (mockups canvas, Marketing homepage): a 1v1 race and a
 * Territory game on the real 3-player map, switching every 8 seconds. Clicking
 * anything pauses the switching for 30 seconds; reduced motion stops it.
 */
export function HeroDemo() {
  const [{ tab, elapsed }, setShown] = useState<{ tab: Tab; elapsed: number }>({ tab: "duel", elapsed: 0 });
  const [pausedUntil, setPausedUntil] = useState(0);
  const reduce = useSyncExternalStore(subscribeMotion, reducedMotion, () => false);

  const paused = reduce || pausedUntil > 0;

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setShown((s) =>
        s.elapsed + TICK_MS < TAB_MS
          ? { ...s, elapsed: s.elapsed + TICK_MS }
          : { tab: s.tab === "duel" ? "territory" : "duel", elapsed: 0 },
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  // Re-render once the pause runs out, so the switching starts again.
  useEffect(() => {
    if (!pausedUntil) return;
    const timer = setTimeout(() => setPausedUntil(0), pausedUntil - Date.now());
    return () => clearTimeout(timer);
  }, [pausedUntil]);

  const pause = () => setPausedUntil(Date.now() + PAUSE_MS);
  const shown = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Live examples" className="flex gap-1.5">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setShown({ tab: t.id, elapsed: 0 });
                  pause();
                }}
                className={cn(
                  "relative h-9 overflow-hidden border-2 border-foreground bg-card px-4 text-[13px] font-medium text-text-secondary",
                  on && "text-foreground",
                )}
                style={on ? { background: WIN[t.color].bar, color: WIN[t.color].text, boxShadow: "3px 3px 0 var(--foreground)" } : undefined}
              >
                {t.label}
                <span aria-hidden className="absolute inset-x-3 bottom-1 h-0.5 rounded-full">
                  <span
                    className="block h-0.5 rounded-full bg-current transition-[width] duration-250 ease-linear"
                    style={{ width: on && !paused ? `${(elapsed / TAB_MS) * 100}%` : 0 }}
                  />
                </span>
              </button>
            );
          })}
        </div>
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:block">
          {reduce ? "CLICK A TAB TO SWITCH" : paused ? "PAUSED · RESUMES IN 30 S" : "AUTO-PLAYS · CLICK TO STAY"}
        </span>
      </div>

      {/* Both examples share one grid cell, so the panel keeps the taller one's
          height and switching tabs never resizes it. The hidden one is inert and
          remounts (fresh state) each time it becomes the shown one. */}
      <WindowCard
        file={shown.file}
        color={shown.color}
        bodyClassName="grid grid-cols-[minmax(0,1fr)]"
        role="tabpanel"
        aria-label={tab === "duel" ? "1v1 race example" : "Territory example"}
      >
        <div className={cn("col-start-1 row-start-1 grid min-w-0 grid-cols-[minmax(0,1fr)]", tab !== "duel" && "invisible")} inert={tab !== "duel"}>
          <DuelExample key={tab === "duel" ? "on" : "off"} onTouch={pause} />
        </div>
        <div className={cn("col-start-1 row-start-1 grid min-w-0 grid-cols-[minmax(0,1fr)]", tab !== "territory" && "invisible")} inert={tab !== "territory"}>
          <TerritoryExample
            key={tab === "territory" ? "on" : "off"}
            onTouch={pause}
            running={!reduce && tab === "territory"}
          />
        </div>
      </WindowCard>
    </div>
  );
}

function useSeconds(start: number) {
  const [secs, setSecs] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return secs;
}

function Bar({ value, of, color }: { value: number; of: number; color: "you" | "opponent" }) {
  return (
    <div className={cn("h-2 rounded-sm", color === "you" ? "bg-duel-you/15" : "bg-duel-opponent/15")}>
      <div
        className={cn(
          "h-2 rounded-sm transition-[width] duration-300 ease-out-cubic",
          color === "you" ? "bg-duel-you" : "bg-duel-opponent",
        )}
        style={{ width: `${(value / of) * 100}%` }}
      />
    </div>
  );
}

function Verdict({ tag }: { tag: "AC" | "WA" | "DOCS" }) {
  return (
    <span
      className={cn(
        "rounded-xs border px-1.5 py-0.5 font-mono text-[11px]",
        tag === "AC" && "border-verdict-ac/30 bg-verdict-ac/10 text-verdict-ac",
        tag === "WA" && "border-verdict-wa/30 bg-verdict-wa/10 text-verdict-wa",
        tag === "DOCS" && "border-border bg-bg-secondary text-text-secondary",
      )}
    >
      {tag}
    </span>
  );
}

function DuelExample({ onTouch }: { onTouch: () => void }) {
  const [passed, setPassed] = useState(9);
  const secs = useSeconds(18 * 60 + 32);
  const won = passed === 12;

  return (
    <div className={cn(panel, "gap-5")}>
      <div className="flex items-center justify-between">
        <span className={eyebrow}>1v1 race · ranked</span>
        <span className="font-mono text-[28px] font-medium tracking-tight tabular-nums">{clock(secs)}</span>
      </div>
      <div className="text-[15px] font-medium">Merge Intervals</div>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-duel-you" />
              <b className="font-medium">You</b>
              <span className="font-mono text-xs text-muted-foreground">1642</span>
            </span>
            <span className="font-mono text-xs tabular-nums">{passed}/12 tests</span>
          </div>
          <Bar value={passed} of={12} color="you" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-duel-opponent" />
              <b className="font-medium">kiri_dev</b>
              <span className="font-mono text-xs text-muted-foreground">1655</span>
            </span>
            <span className="font-mono text-xs tabular-nums">7/12 tests</span>
          </div>
          <Bar value={7} of={12} color="opponent" />
        </div>
      </div>
      <ul className="flex flex-col gap-2.5 border-t pt-4 text-[13px]">
        <li className="flex items-center gap-2.5">
          <Verdict tag={won ? "AC" : "WA"} />
          <span>You submitted</span>
          <span className="ml-auto font-mono text-muted-foreground tabular-nums">{passed}/12 · 41 ms</span>
        </li>
        <li className="flex items-center gap-2.5">
          <Verdict tag="WA" />
          <span>kiri_dev submitted</span>
          <span className="ml-auto font-mono text-muted-foreground">7/12</span>
        </li>
        <li className="flex items-center gap-2.5">
          <Verdict tag="DOCS" />
          <span className="truncate">You opened python › sorting HOWTO</span>
          <span className="ml-auto font-mono text-muted-foreground">logged</span>
        </li>
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={() => {
            setPassed(12);
            onTouch();
          }}
        >
          {won ? "Accepted: you win" : "Try it: submit a fix"}
        </Button>
        <span className="text-xs text-muted-foreground">Find a match is ranked. Challenges: you choose.</span>
      </div>
    </div>
  );
}

// The real 37-region map for 3 players (decisions §16), with three made-up players.
const MAP = buildMap(3);
const TO_WIN = winningPoints(MAP);
const TOTAL = totalPoints(MAP);
const PLAYERS: (MapPlayer & { name: string })[] = [
  { userId: "you", initial: "Y", color: "you", name: "You" },
  { userId: "kiri", initial: "K", color: "opponent", name: "kiri_dev" },
  { userId: "lex", initial: "L", color: "p3", name: "lex" },
];
const BAR: Record<PlayerColor, string> = {
  you: "bg-duel-you",
  opponent: "bg-duel-opponent",
  p3: "bg-duel-p3",
  p4: "bg-duel-p4",
  p5: "bg-duel-p5",
  p6: "bg-duel-p6",
};

type Owners = Record<number, string>;
type FeedItem = { who: string; text: string };

function startOwners(): Owners {
  const owners: Owners = {};
  for (const region of MAP) if (region.home !== undefined) owners[region.index] = PLAYERS[region.home].userId;
  return owners;
}

function takeable(owners: Owners, player: string) {
  return MAP.filter(
    (region) =>
      region.home === undefined &&
      owners[region.index] !== player &&
      neighbours(MAP, region.index).some((n) => owners[n.index] === player),
  );
}

const nameOf = (id: string) => PLAYERS.find((p) => p.userId === id)!.name;

function describe(player: string, index: number, before: string | undefined) {
  const region = MAP[index];
  const who = nameOf(player);
  if (before) return `${who} took a region from ${before === "you" ? "you" : nameOf(before)}`;
  return region.core ? `${who} claimed the Core · +5` : `${who} claimed a region · +${region.value}`;
}

type Board = { owners: Owners; feed: FeedItem[]; step: number };

const startBoard = (): Board => ({ owners: startOwners(), feed: [], step: 0 });

function withTake(board: Board, player: string, index: number): Board {
  const before = board.owners[index];
  return {
    ...board,
    owners: { ...board.owners, [index]: player },
    feed: [{ who: player, text: describe(player, index, before) }, ...board.feed].slice(0, 4),
  };
}

// The rivals take turns: each claims its cheapest empty region next to its own,
// and the board starts over after 14 turns.
function rivalTurn(board: Board): Board {
  if (board.step >= 14) return startBoard();
  const player = PLAYERS[1 + (board.step % 2)].userId;
  const next = { ...board, step: board.step + 1 };
  const options = takeable(board.owners, player).filter((r) => !board.owners[r.index]);
  if (!options.length) return next;
  const pick = options.sort((a, b) => a.value - b.value || a.index - b.index)[0];
  return withTake(next, player, pick.index);
}

function TerritoryExample({ onTouch, running }: { onTouch: () => void; running: boolean }) {
  const [board, setBoard] = useState<Board>(startBoard);
  const { owners, feed } = board;
  const secs = useSeconds(21 * 60 + 24);

  const take = (player: string, index: number) => setBoard((b) => withTake(b, player, index));

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setBoard(rivalTurn), 1750);
    return () => clearInterval(timer);
  }, [running]);

  const points = useMemo(() => {
    const sum: Record<string, number> = { you: 0, kiri: 0, lex: 0 };
    for (const [index, owner] of Object.entries(owners)) sum[owner] += MAP[Number(index)].value;
    return sum;
  }, [owners]);

  const mine = takeable(owners, "you").filter((r) => !owners[r.index]);
  const regions = MAP.map((region) => ({ ...region, ownerId: owners[region.index] }));

  return (
    <div className={cn(panel, "gap-4")}>
      <div className="flex items-center justify-between">
        <span className={eyebrow}>Territory · ranked · 3 players</span>
        <span className="font-mono text-[28px] font-medium tracking-tight tabular-nums">{clock(secs)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PLAYERS.map((p) => (
          <div
            key={p.userId}
            className={cn(
              "flex items-center gap-2 rounded-[10px] border px-2.5 py-2",
              p.userId === "you" && "border-duel-you/40 bg-duel-you/5",
            )}
          >
            <span className={cn("size-2.5 shrink-0 rounded-[3px]", BAR[p.color])} />
            <span className="grow truncate text-[13px] font-medium">{p.name}</span>
            <span className="font-mono text-base font-medium tabular-nums">{points[p.userId]}</span>
          </div>
        ))}
      </div>
      <div className="relative flex h-1.5 overflow-hidden rounded-[3px] bg-bg-tertiary" aria-hidden>
        {PLAYERS.map((p) => (
          <span
            key={p.userId}
            className={cn("h-1.5 transition-[width] duration-400 ease-out-cubic", BAR[p.color])}
            style={{ width: `${(points[p.userId] / TOTAL) * 100}%` }}
          />
        ))}
        <span className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${(TO_WIN / TOTAL) * 100}%` }} />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto aspect-[1.1] w-full max-w-[280px] shrink-0 sm:mx-0 sm:w-[260px]">
          <HexMap
            regions={regions}
            players={PLAYERS}
            takeable={new Set(mine.map((r) => r.index))}
            selected={null}
            now={0}
            onSelect={(index) => {
              if (!mine.some((r) => r.index === index)) return;
              take("you", index);
              onTouch();
            }}
          />
        </div>
        <div className="flex min-w-0 grow flex-col gap-2.5">
          <span className={cn(eyebrow, "text-[10px]")}>Match feed</span>
          {feed.length === 0 && <span className="text-xs text-muted-foreground">Everyone starts on a home base.</span>}
          <ul className="flex flex-col gap-2.5" aria-live="polite">
            {feed.map((item, i) => (
              <li key={`${feed.length}-${i}`} className="flex items-center gap-2 text-xs">
                <span
                  className={cn("size-2 shrink-0 rounded-[2px]", BAR[PLAYERS.find((p) => p.userId === item.who)!.color])}
                />
                <span className="text-text-secondary">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={!mine.length}
          onClick={() => {
            const best = [...mine].sort((a, b) => b.value - a.value)[0];
            if (best) take("you", best.index);
            onTouch();
          }}
        >
          {mine.length ? "Try it: claim a region" : "Nothing left to claim"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Solve a region&apos;s problem to claim it. {TO_WIN} of {TOTAL} points wins.
        </span>
      </div>
    </div>
  );
}
