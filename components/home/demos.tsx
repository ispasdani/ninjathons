"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { levelProgress, TITLES } from "@/convex/lib/levels";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { WindowCard } from "@/components/ui/window-card";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

/** Time left until the daily challenge resets at 00:00 UTC (decisions §15). */
export function DailyCountdown() {
  const now = useNow(1000);
  const left = Math.floor((86_400_000 - (now % 86_400_000)) / 1000);
  const hh = String(Math.floor(left / 3600)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className="font-mono text-xs tabular-nums" suppressHydrationWarning>
      RESETS IN {hh}:{mm}:{ss}
    </span>
  );
}

const FIRST_FEED = [
  ["Daily challenge, 12-day streak", "+80"],
  ["Ranked 1v1 win vs kiri_dev", "+25"],
  ["Hard problem, first solve", "+40"],
  ["Lesson: Two pointers", "+15"],
];

/** The level card with a button that earns XP, using the real level curve (decisions §13). */
export function LevelDemo() {
  const [xp, setXp] = useState(5150);
  const [feed, setFeed] = useState(FIRST_FEED);
  const [toast, setToast] = useState<string | null>(null);
  const p = levelProgress(xp);
  const pct = ((xp - p.levelXp) / (p.nextLevelXp - p.levelXp)) * 100;

  function earn() {
    const after = levelProgress(xp + 20);
    if (after.level > p.level) {
      setToast(
        `Level ${after.level} reached.${after.title !== p.title ? ` New title: ${after.title}.` : ""}`,
      );
    }
    setXp(xp + 20);
    setFeed([["Medium problem, first solve", "+20"], ...feed].slice(0, 4));
  }

  return (
    <WindowCard file="level_up.exe" color="orange" bodyClassName="gap-4.5 p-6 sm:p-7">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 flex-col items-center justify-center bg-foreground text-background">
          <span className="font-mono text-[9px] tracking-widest opacity-70">LEVEL</span>
          <span className="font-mono text-2xl leading-[26px] font-medium tabular-nums">{p.level}</span>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[22px] font-medium tracking-tight">{p.title}</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {xp.toLocaleString("en-US")} XP · {(p.nextLevelXp - xp).toLocaleString("en-US")} TO LEVEL {p.level + 1}
          </span>
        </span>
      </div>
      {/* Your XP bar is one of the places the brand green belongs (design.md 2.7). */}
      <div
        className="h-2.5 rounded-sm bg-bg-tertiary"
        role="progressbar"
        aria-label="Progress to the next level"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-2.5 rounded-sm bg-brand transition-[width] duration-400 ease-out-cubic" style={{ width: `${pct}%` }} />
      </div>
      {toast && (
        <div role="status" className="border border-success/40 bg-success/10 px-3.5 py-2.5 text-[13px]">
          {toast}
        </div>
      )}
      <div className="flex flex-col">
        <span className={cn(eyebrow, "pb-1.5 text-[10px]")}>Recent XP</span>
        {feed.map(([what, amount], i) => (
          <div key={`${feed.length}-${i}`} className="flex h-8 items-center justify-between border-b text-[13px]">
            <span>{what}</span>
            <span className="font-mono tabular-nums">{amount}</span>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="self-start" onClick={earn}>
        Try it: solve a medium problem (+20 XP)
      </Button>
    </WindowCard>
  );
}

/** The 8 title bands, the current one filled in. */
export function TitleBands({ level = 14 }: { level?: number }) {
  const current = [...TITLES].reverse().find((t) => level >= t.from)!.title;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TITLES.map((band, i) => {
        const next = TITLES[i + 1];
        const on = band.title === current;
        return (
          <div
            key={band.title}
            className={cn(
              "flex flex-col gap-0.5 border p-2.5",
              on && "border-foreground bg-foreground text-background",
            )}
          >
            <span className={cn("text-[13px] font-medium", !on && level < band.from && "text-muted-foreground")}>
              {band.title}
            </span>
            <span className={cn("font-mono text-[10px]", on ? "opacity-70" : "text-muted-foreground")}>
              LV {band.from}
              {next ? `–${next.from - 1}` : "+"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type Row = [name: string, country: string, value: string];
const BOARDS: { id: string; name: string; by: string; rows: Row[]; you: string }[] = [
  { id: "level", name: "Level", by: "TOTAL XP", rows: [["kvasir", "NO", "Lv 52 · Legend"], ["tess", "IE", "Lv 47 · Sensei"], ["rakan", "SA", "Lv 45 · Sensei"], ["pavel", "CZ", "Lv 41 · Sensei"]], you: "Lv 14 · Debugger" },
  { id: "1v1", name: "1v1", by: "1V1 RATING", rows: [["kvasir", "NO", "2841"], ["lina.k", "PL", "2803"], ["otto_dev", "DE", "2766"], ["sato_r", "JP", "2711"]], you: "1642" },
  { id: "territory", name: "Territory", by: "TERRITORY RATING", rows: [["amaru", "PE", "2512"], ["ines.m", "PT", "2470"], ["zeno", "IT", "2433"], ["fjord", "DK", "2401"]], you: "1588" },
  { id: "daily", name: "Daily", by: "CURRENT STREAK", rows: [["rakan", "SA", "212 days"], ["tess", "IE", "187 days"], ["hollow", "RO", "151 days"], ["pavel", "CZ", "98 days"]], you: "12 days" },
  { id: "weekly", name: "Weekly", by: "POINTS THIS WEEK", rows: [["sato_r", "JP", "900"], ["lina.k", "PL", "900"], ["kvasir", "NO", "700"], ["nora.s", "DK", "700"]], you: "500" },
  { id: "learning", name: "Learning", by: "LEARNING XP", rows: [["mira", "DK", "2,140"], ["olu", "NG", "1,955"], ["aria_p", "IN", "1,830"], ["ilse", "NL", "1,610"]], you: "465" },
  { id: "ninjathons", name: "Ninjathons", by: "EVENT PLACEMENTS", rows: [["kvasir", "NO", "3 wins"], ["lina.k", "PL", "2 wins"], ["olu", "NG", "2 wins"], ["zeno", "IT", "1 win"]], you: "1 entry" },
];
const SCOPES = [
  { id: "global", name: "Global", rank: "#1,284" },
  { id: "country", name: "Country", rank: "#14" },
  { id: "group", name: "Acme dev team", rank: "#2" },
];
const GROUP = ["lex", "nora.s", "mads.h", "tmp_user"];

function initials(name: string) {
  return name.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
}

/** An example board with the real boards and scopes (decisions §13), made-up players. */
export function LeaderboardDemo() {
  const [boardId, setBoardId] = useState("1v1");
  const [scopeId, setScopeId] = useState("global");
  const board = BOARDS.find((b) => b.id === boardId)!;
  const scope = SCOPES.find((s) => s.id === scopeId)!;

  const others = board.rows.map(([name, cc, value], i): Row => (scopeId === "group" ? [GROUP[i], "DK", value] : [name, cc, value]));
  const you = { rank: scope.rank, name: "daniel (you)", cc: "DK", value: board.you, you: true };
  const rows = others.map(([name, cc, value], i) => ({ rank: `#${i + 1}`, name, cc, value, you: false }));
  if (scopeId === "group") {
    rows.splice(1, 0, you);
    rows.pop();
    rows.forEach((r, i) => (r.rank = `#${i + 1}`));
  } else rows.push(you);

  return (
    <WindowCard file="leaderboard.exe" color="yellow">
      <div role="tablist" aria-label="Board" className="flex gap-5 overflow-x-auto border-b px-5">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={b.id === boardId}
            onClick={() => setBoardId(b.id)}
            className={cn(
              "h-11 shrink-0 border-b-2 border-transparent px-0.5 text-[13px] text-muted-foreground",
              b.id === boardId && "border-foreground font-medium text-foreground",
            )}
          >
            {b.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div role="group" aria-label="Scope" className="flex gap-1 border bg-bg-secondary p-[3px]">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              aria-pressed={s.id === scopeId}
              onClick={() => setScopeId(s.id)}
              className={cn(
                "h-[30px] px-3 text-[13px] text-text-secondary",
                s.id === scopeId && "bg-background font-medium text-foreground shadow-ring",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">RANKED BY {board.by}</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className={cn(
            "grid h-11 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2 border-t px-5 text-[13px]",
            r.you && "bg-brand/10 shadow-[inset_2px_0_0_var(--brand)]",
          )}
        >
          <span className="font-mono font-medium tabular-nums">{r.rank}</span>
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-bg-secondary text-[10px] font-medium">
              {r.you ? "DI" : initials(r.name)}
            </span>
            <span className="truncate font-medium">{r.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{r.cc}</span>
          </span>
          <span className="text-right font-mono tabular-nums">{r.value}</span>
        </div>
      ))}
    </WindowCard>
  );
}

/** The copy button on the example group invite code. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      className="ml-auto"
      onClick={() => {
        navigator.clipboard?.writeText(code).catch(() => {});
        setCopied(true);
      }}
    >
      {copied ? <Check aria-hidden /> : null}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
