"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";

import { MATCH_LANGUAGES } from "@/components/play/language-picker";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { DOT, type MapPlayer, PLAYER_COLORS, regionName } from "./hex-map";

export type Game = NonNullable<FunctionReturnType<typeof api.territory.get>>;
export type GamePlayer = Game["players"][number];

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(MATCH_LANGUAGES);

export function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function ordinal(n: number) {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

/** Colours and the initials shown on the map: you first, then by home base. */
export function mapPlayers(game: Game): (MapPlayer & { player: GamePlayer })[] {
  const others = game.players.filter((p) => !p.you).sort((a, b) => a.slot - b.slot);
  const ordered = [...game.players.filter((p) => p.you), ...others];
  return ordered.map((player, i) => ({
    userId: player.userId,
    initial: player.username.slice(0, 2).toUpperCase(),
    color: PLAYER_COLORS[i],
    player,
  }));
}

export function nameOf(player: GamePlayer | undefined) {
  if (!player) return "Deleted player";
  return player.you ? "You" : `@${player.username}`;
}

/** Everyone's points as one bar, with a marker at the points that win at once. */
function ScoreBar({ game }: { game: Game }) {
  const players = mapPlayers(game).sort((a, b) => b.player.points - a.player.points);
  const mark = (game.winningPoints / game.totalPoints) * 100;
  return (
    <div className="min-w-0 flex-[1_1_24rem]">
      <div className="relative h-2 overflow-hidden rounded-sm bg-bg-tertiary" aria-hidden>
        <div className="flex h-full">
          {players.map((p) => (
            <div
              key={p.userId}
              className={cn("h-full transition-[width] duration-500 ease-out-quad", DOT[p.color], p.player.left && "opacity-40")}
              style={{ width: `${(p.player.points / game.totalPoints) * 100}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-y-0 w-px bg-foreground" style={{ left: `${mark}%` }} />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label="Scores">
        {players.map((p) => (
          <li key={p.userId} className={cn("flex items-center gap-1.5", p.player.left && "text-muted-foreground line-through")}>
            <span aria-hidden className={cn("size-2 rounded-full", DOT[p.color])} />
            <span className={cn(p.player.you && "font-medium")}>{nameOf(p.player)}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {p.player.points} pts · {p.player.regions}
            </span>
          </li>
        ))}
        <li className="font-mono text-xs text-muted-foreground tabular-nums">{game.winningPoints} wins</li>
      </ul>
    </div>
  );
}

/** The strip above the workspace: server timer, the scores and Give up. */
export function GameHud({ game, now, onForfeit }: { game: Game; now: number; onForfeit: () => void }) {
  const left = game.endsAt - now;
  const me = game.players.find((p) => p.you)!;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn("font-mono text-xl font-medium tabular-nums", left < 60_000 && game.status === "active" && "text-destructive")}
          aria-label="Time left"
        >
          {game.timeUp ? "0:00" : clock(left)}
        </span>
        <span className="hidden font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase sm:inline">
          {game.ranked ? "Ranked" : "Unranked"}
        </span>
      </div>
      <ScoreBar game={game} />
      {game.status === "active" && !game.timeUp && !me.left && (
        <Button variant="ghost" size="sm" onClick={onForfeit}>
          Give up
        </Button>
      )}
    </div>
  );
}

/** Before the start: who's playing, the map and the countdown. Problems are still hidden. */
export function GameCountdown({ game, now, onLeave }: { game: Game; now: number; onLeave: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <p className={eyebrow}>{game.ranked ? "Ranked" : "Unranked"} Territory</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Game found</h1>
      <ul className="mt-8 divide-y rounded-md border">
        {mapPlayers(game).map((p) => (
          <li key={p.userId} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            <span aria-hidden className={cn("size-2 rounded-full", DOT[p.color])} />
            <span className="font-medium">{p.player.you ? "You" : `@${p.player.username}`}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {p.player.rating !== null ? `${p.player.rating} · ${p.player.tier}` : "Rating provisional"}
            </span>
            <span className="ml-auto text-muted-foreground">{LANGUAGE_LABELS[p.player.language]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex items-center justify-between gap-4 rounded-md border bg-bg-secondary p-6">
        <div className="space-y-1 text-[13px]">
          <p className="font-medium">
            {game.regions.length} regions · {game.totalPoints} points
          </p>
          <p className="text-muted-foreground">30 minutes · {game.winningPoints} points win at once</p>
        </div>
        <p className="font-mono text-5xl font-medium tabular-nums" role="timer" aria-label="Starts in">
          {Math.max(0, Math.ceil((game.startsAt - now) / 1000))}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="mt-4" onClick={onLeave}>
        Leave (cancels the game)
      </Button>
    </div>
  );
}

function headline(game: Game, me: GamePlayer) {
  if (game.status === "cancelled") return { title: "Game cancelled", detail: "Someone left before the start. No result." };
  const winner = game.players.find((p) => p.userId === game.winnerId);
  const reason =
    game.reason === "majority"
      ? `${winner ? nameOf(winner) : "A player"} passed half the points.`
      : game.reason === "last-standing"
        ? "Everyone else left."
        : "Time ran out.";
  const place = me.place ?? game.players.length;
  if (place === 1) return { title: game.winnerId ? "You won" : "You tied for 1st", detail: reason };
  return { title: `You placed ${ordinal(place)} of ${game.players.length}`, detail: reason };
}

/** After the end: placement, rating change, XP and badges. */
export function GameResult({ game }: { game: Game }) {
  const me = game.players.find((p) => p.you)!;
  const earned = me.badgesEarned ?? [];
  const badges = useQuery(api.badges.list, earned.length ? {} : "skip");
  const { title, detail } = headline(game, me);
  const names = earned.map((id) => badges?.find((b) => b.id === id)?.name ?? "…");
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-4" role="status">
      <div className="min-w-0">
        <p className={cn("text-xl font-medium", me.place === 1 && "text-duel-you")}>{title}</p>
        <p className="text-[13px] text-muted-foreground">{detail}</p>
      </div>
      {game.status === "finished" && (
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
          {game.ranked && !me.counted && (
            <span className="text-muted-foreground">Not rated: some of you have played 3 rated games together today.</span>
          )}
          {!game.ranked && <span className="text-muted-foreground">Unranked: no rating change.</span>}
          {names.length > 0 && (
            <Link href="/badges" className="text-text-secondary hover:underline">
              {names.length === 1 ? "Badge earned" : "Badges earned"}: {names.join(", ")}
            </Link>
          )}
        </div>
      )}
      <div className="ml-auto flex flex-wrap gap-2">
        <Button variant="brand" size="sm" asChild>
          <Link href="/play/territory">Play again</Link>
        </Button>
      </div>
    </div>
  );
}

/** Final standings, in place order. */
export function Standings({ game }: { game: Game }) {
  const colors = new Map(mapPlayers(game).map((p) => [p.userId, p.color]));
  const rows = [...game.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.points - a.points);
  return (
    <ol className="divide-y rounded-md border text-[13px]">
      {rows.map((p) => (
        <li key={p.userId} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-8 font-mono text-xs text-muted-foreground tabular-nums">{p.place ? ordinal(p.place) : ""}</span>
          <span aria-hidden className={cn("size-2 rounded-full", DOT[colors.get(p.userId)!])} />
          <span className={cn(p.you && "font-medium")}>{nameOf(p)}</span>
          {p.left && <span className="text-muted-foreground">left</span>}
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
            {p.points} pts · {p.regions} regions
            {p.ratingChange !== undefined && ` · ${p.ratingChange >= 0 ? "+" : ""}${p.ratingChange}`}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The game feed: captures and Submits as counts, never code. */
export function GameFeed({ game }: { game: Game }) {
  const players = new Map(game.players.map((p) => [p.userId, p]));
  const colors = new Map(mapPlayers(game).map((p) => [p.userId, p.color]));
  if (game.events.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Nothing yet. Claims, attacks and Submits show here.</p>;
  }
  return (
    <ol className="space-y-2 text-[13px]">
      {game.events.map((e) => {
        const region = e.region === undefined ? undefined : game.regions[e.region];
        const where = region ? regionName(region) : "a region";
        const text =
          e.kind === "claim"
            ? `claimed ${where}`
            : e.kind === "attack"
              ? `took ${where} from ${nameOf(e.fromId ? players.get(e.fromId) : undefined)}`
              : e.kind === "missed"
                ? "solved too late; someone got there first"
                : e.kind === "forfeit"
                  ? "left the game"
                  : e.accepted
                    ? `passed every test (${e.total}/${e.total})`
                    : `passed ${e.passed}/${e.total} tests`;
        const color = colors.get(e.userId);
        return (
          <li key={e._id} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn("size-2 shrink-0 rounded-full", color ? DOT[color] : "bg-duel-neutral")}
            />
            <span className="font-medium">{nameOf(players.get(e.userId))}</span>
            <span className="text-muted-foreground">{text}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
              {new Date(e._creationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
