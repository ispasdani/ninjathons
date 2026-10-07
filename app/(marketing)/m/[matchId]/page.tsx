import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import Link from "next/link";

import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { duration, headline, LANGUAGE_NAMES, modeName, playerName, type ResultPlayer } from "@/lib/share";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

function capitalized(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function generateMetadata({ params }: PageProps<"/m/[matchId]">): Promise<Metadata> {
  const { matchId } = await params;
  const result = await fetchQuery(api.matches.result, { id: matchId });
  if (!result) return { title: "Match not found" };
  const { title, detail } = headline(result);
  const text = `${capitalized(title)} ${detail}`.trim();
  const description = result.problem ? `${text} · ${result.problem.title}` : text;
  const image = { url: `/m/${matchId}/card`, width: 1200, height: 630, alt: description };
  return {
    title: capitalized(title),
    description,
    openGraph: { title: text, description, images: [image] },
    twitter: { card: "summary_large_image", title: text, description, images: [image] },
  };
}

function Side({ player, side }: { player: ResultPlayer; side: 0 | 1 }) {
  const total = player.total || player.bestPassed || 1;
  return (
    <div className={cn("flex-1 rounded-md border p-6", player.result === "win" && "border-border-strong")}>
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <span aria-hidden className={cn("size-2 rounded-full", side === 0 ? "bg-duel-you" : "bg-duel-opponent")} />
        {capitalized(playerName(player))}
        {player.result === "win" && (
          <span className="rounded-xs bg-brand px-1.5 py-0.5 font-mono text-xs text-brand-foreground">WON</span>
        )}
      </p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {LANGUAGE_NAMES[player.language] ?? player.language}
        {player.rating !== null && ` · ${player.rating} ${player.tier}`}
        {player.ratingChange !== null && ` (${player.ratingChange >= 0 ? "+" : ""}${player.ratingChange})`}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary">
        <div
          className={cn("h-full", side === 0 ? "bg-duel-you" : "bg-duel-opponent", player.ghost && "opacity-50")}
          style={{ width: `${player.solvedInMs !== null ? 100 : Math.min(100, (player.bestPassed / total) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {player.solvedInMs !== null
          ? `Solved in ${duration(player.solvedInMs)}`
          : `${player.bestPassed}/${player.total || "?"} tests`}{" "}
        · {player.submits} {player.submits === 1 ? "submit" : "submits"}
      </p>
    </div>
  );
}

/**
 * A finished match's result, public so it can be shared. Its link preview is
 * the card from ./card. Nothing shows while a match is on.
 */
export default async function MatchResultPage({ params }: PageProps<"/m/[matchId]">) {
  const { matchId } = await params;
  const result = await fetchQuery(api.matches.result, { id: matchId });
  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-[13px] text-muted-foreground">
        <p>No finished match here. Results show once a match is over.</p>
      </div>
    );
  }
  const { title, detail } = headline(result);
  const [a, b] = result.players;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className={eyebrow}>{modeName(result)}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{capitalized(title)}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-muted-foreground">
        {detail && <span>{detail}</span>}
        {result.problem && (
          <>
            <span aria-hidden>·</span>
            <Link href={`/solve/${result.problem.slug}`} className="text-foreground hover:underline">
              {result.problem.title}
            </Link>
            <Difficulty level={result.problem.difficulty} />
          </>
        )}
      </p>
      {result.finishedAt && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {new Date(result.finishedAt).toISOString().slice(0, 10)}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        {a && <Side player={a} side={0} />}
        {b && <Side player={b} side={1} />}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 rounded-md border bg-bg-secondary p-6">
        <p className="text-[13px] text-muted-foreground">
          Same problem, first to pass every test wins. Think you&apos;re faster?
        </p>
        <Button variant="brand" className="ml-auto" asChild>
          <Link href="/play">Play a match</Link>
        </Button>
      </div>
    </div>
  );
}
