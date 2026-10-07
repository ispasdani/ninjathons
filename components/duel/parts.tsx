"use client";

import { useQuery } from "convex/react";
import { Check, Share2 } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";

import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export type Match = NonNullable<FunctionReturnType<typeof api.matches.get>>;
export type Player = Match["players"][number];

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

// The time limits by difficulty, for the countdown card (convex/lib/matches.ts).
const MINUTES = { easy: 15, medium: 25, hard: 40 } as const;

export function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A ghost is labelled as one everywhere, never as the live player. */
export function displayName(player: Player) {
  return player.ghost ? `Ghost of @${player.username}` : player.username;
}

/** Ghost race, Ranked or Unranked. */
export function modeLabel(match: Match) {
  if (match.source === "ghost") return "Ghost race";
  return match.ranked ? "Ranked" : "Unranked";
}

export function languageLabel(match: Match, id: string) {
  return match.problem?.languages.find((l) => l.id === id)?.label ?? LANGUAGE_NAMES[id] ?? id;
}

const LANGUAGE_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  rust: "Rust",
};

function PlayerName({ player, side }: { player: Player; side: "you" | "opponent" }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", side === "you" ? "bg-duel-you" : "bg-duel-opponent")}
      />
      <span className="truncate font-medium">{side === "you" ? "You" : displayName(player)}</span>
    </span>
  );
}

/** One side's progress: best Submit's tests passed, and Submits sent. */
function Progress({ player, side, tests }: { player: Player; side: "you" | "opponent"; tests: number }) {
  const total = player.total || tests;
  const share = total ? player.bestPassed / total : 0;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <PlayerName player={player} side={side} />
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {player.solved ? "Solved" : `${player.bestPassed}/${total}`} · {player.submits}{" "}
          {player.submits === 1 ? "submit" : "submits"}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary"
        role="progressbar"
        aria-label={`${side === "you" ? "Your" : `${displayName(player)}'s`} tests passed`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={player.bestPassed}
      >
        <div
          className={cn(
            "h-full transition-[width] duration-500 ease-out-quad",
            side === "you" ? "bg-duel-you" : "bg-duel-opponent",
            player.ghost && "opacity-50",
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  );
}

/** The strip above the workspace (design.md 5): server timer and both progress bars. */
export function DuelHud({ match, now, onForfeit }: { match: Match; now: number; onForfeit: () => void }) {
  const me = match.players.find((p) => p.you)!;
  const them = match.players.find((p) => !p.you);
  const left = match.endsAt - now;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "font-mono text-xl font-medium tabular-nums",
            left < 60_000 && match.status === "active" && "text-destructive",
          )}
          aria-label="Time left"
        >
          {match.timeUp ? "0:00" : clock(left)}
        </span>
        <span className="hidden font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase sm:inline">
          {modeLabel(match)}
        </span>
      </div>
      <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-2 sm:flex-row sm:gap-6">
        <Progress player={me} side="you" tests={match.tests ?? 0} />
        {them && <Progress player={them} side="opponent" tests={match.tests ?? 0} />}
      </div>
      {match.status === "active" && !match.timeUp && (
        <Button variant="ghost" size="sm" onClick={onForfeit}>
          Give up
        </Button>
      )}
    </div>
  );
}

function PlayerCard({ match, player }: { match: Match; player: Player }) {
  return (
    <div className="flex-1 rounded-md border p-4">
      <PlayerName player={player} side={player.you ? "you" : "opponent"} />
      {!player.you && <p className="sr-only">Opponent: {displayName(player)}</p>}
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {player.rating !== null ? `${player.rating} · ${player.tier}` : "Rating provisional"}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{languageLabel(match, player.language)}</p>
    </div>
  );
}

/** Before the start: who you play, the format, and the countdown. The problem is still hidden. */
export function DuelCountdown({ match, now, onLeave }: { match: Match; now: number; onLeave: () => void }) {
  const me = match.players.find((p) => p.you)!;
  const them = match.players.find((p) => !p.you);
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <p className={eyebrow}>{match.source === "ghost" ? "Ghost race · no rating change" : `${modeLabel(match)} match`}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Match found</h1>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <PlayerCard match={match} player={me} />
        <span className="text-center font-mono text-xs text-muted-foreground uppercase">vs</span>
        {them && <PlayerCard match={match} player={them} />}
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 rounded-md border bg-bg-secondary p-6">
        <div className="space-y-1 text-[13px]">
          <Difficulty level={match.difficulty} />
          <p className="text-muted-foreground">{MINUTES[match.difficulty]} minutes · first to pass every test wins</p>
        </div>
        <p className="font-mono text-5xl font-medium tabular-nums" role="timer" aria-label="Starts in">
          {Math.max(0, Math.ceil((match.startsAt - now) / 1000))}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="mt-4" onClick={onLeave}>
        Leave (no result)
      </Button>
    </div>
  );
}

const REASONS = {
  solved: "passed every test first",
  time: "time ran out",
  forfeit: "gave up",
  cancelled: "",
} as const;

function headline(match: Match, me: Player) {
  if (match.status === "cancelled") return { title: "Match cancelled", detail: "Left before the start. No result." };
  if (match.source === "ghost" && match.reason === "solved") {
    return me.result === "win"
      ? { title: "You beat the ghost", detail: "You passed every test before the recording did." }
      : { title: "The ghost won", detail: "The recording passed every test first." };
  }
  const them = match.players.find((p) => !p.you);
  const name = them ? displayName(them) : "Your opponent";
  if (me.result === "draw") return { title: "Draw", detail: "Time ran out with no Submit ahead." };
  const won = me.result === "win";
  const reason = match.reason ?? "solved";
  if (reason === "forfeit") return { title: won ? "You won" : "You lost", detail: won ? `${name} gave up.` : "You gave up." };
  if (reason === "time") {
    return { title: won ? "You won" : "You lost", detail: `Time ran out; ${won ? "you" : name} passed more tests.` };
  }
  return { title: won ? "You won" : "You lost", detail: `${won ? "You" : name} ${REASONS[reason]}.` };
}

/**
 * Shares the public result page (/m/<id>), whose link preview is the card:
 * the phone's share sheet where there is one, else the link is copied.
 */
function ShareButton({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/m/${matchId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // Closed, or not allowed here: fall back to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={share}>
        {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
        {copied ? "Link copied" : "Share"}
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <a href={`/m/${matchId}/card`} target="_blank" rel="noopener">
          Card
        </a>
      </Button>
    </>
  );
}

/** After the end: the result, rating change, XP and badges. */
export function DuelResult({ match }: { match: Match }) {
  const me = match.players.find((p) => p.you)!;
  const earned = me.badgesEarned ?? [];
  const badges = useQuery(api.badges.list, earned.length ? {} : "skip");
  const { title, detail } = headline(match, me);
  const names = earned.map((id) => badges?.find((b) => b.id === id)?.name ?? "…");

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-4" role="status">
      <div className="min-w-0">
        <p className={cn("text-xl font-medium", me.result === "win" && "text-duel-you")}>{title}</p>
        <p className="text-[13px] text-muted-foreground">{detail}</p>
      </div>
      {match.status === "finished" && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {me.ratingChange !== undefined && (
            <span className="rounded-xs bg-bg-secondary px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums">
              {me.ratingChange >= 0 ? "+" : ""}
              {me.ratingChange} rating
            </span>
          )}
          {me.xpAwarded !== undefined && (
            <span className="rounded-xs bg-brand px-1.5 py-0.5 font-mono text-xs font-medium text-brand-foreground tabular-nums">
              +{me.xpAwarded} XP
            </span>
          )}
          {match.ranked && !me.counted && (
            <span className="text-muted-foreground">Not rated: you&apos;ve played 3 rated games against them today.</span>
          )}
          {!match.ranked && (
            <span className="text-muted-foreground">
              {match.source === "ghost" ? "Ghost race: no rating change." : "Unranked: no rating change."}
            </span>
          )}
          {names.length > 0 && (
            <Link href="/badges" className="text-text-secondary hover:underline">
              {names.length === 1 ? "Badge earned" : "Badges earned"}: {names.join(", ")}
            </Link>
          )}
        </div>
      )}
      <div className="ml-auto flex flex-wrap gap-2">
        {match.status === "finished" && <ShareButton matchId={match._id} />}
        <Button variant="outline" size="sm" asChild>
          <Link href="/problems">Problems</Link>
        </Button>
        <Button variant="brand" size="sm" asChild>
          <Link href="/play">Find another match</Link>
        </Button>
      </div>
    </div>
  );
}

/** The match feed: Submits as counts, never code. */
export function DuelFeed({ match }: { match: Match }) {
  const names = new Map(match.players.map((p) => [p.userId, p.you ? "You" : displayName(p)]));
  const yours = new Set(match.players.filter((p) => p.you).map((p) => p.userId));
  if (match.events.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No Submits yet. Each one shows here as tests passed.</p>;
  }
  return (
    <ol className="space-y-2 text-[13px]">
      {match.events.map((e) => (
        <li key={e._id} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", yours.has(e.userId) ? "bg-duel-you" : "bg-duel-opponent")}
          />
          <span className="font-medium">{names.get(e.userId) ?? "Deleted player"}</span>
          <span className="text-muted-foreground">
            {e.kind === "forfeit"
              ? "gave up"
              : e.accepted
                ? `passed every test (${e.total}/${e.total})`
                : `passed ${e.passed}/${e.total} tests`}
          </span>
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
            {new Date(e._creationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </li>
      ))}
    </ol>
  );
}
