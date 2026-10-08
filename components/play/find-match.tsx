"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";
import { ChallengeForm, ChallengeLists } from "./challenges";
import { LanguagePicker, savedLanguage } from "./language-picker";
import { PlayTabs } from "./play-tabs";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
// The queue drops rows not seen for 30 s (convex/queue.ts).
const HEARTBEAT_MS = 10_000;
// Offer a ghost race after this long in the queue, or at once when nobody waits.
const GHOST_AFTER_MS = 20_000;

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The Play page: pick a language, then Find a match (the ranked queue) or
 * challenge someone. Goes to the duel screen as soon as a match is made.
 */
export function FindMatch() {
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.queue.status, isAuthenticated ? {} : "skip");
  const current = useQuery(api.matches.current, isAuthenticated ? {} : "skip");
  const ratings = useQuery(api.ratings.mine, isAuthenticated ? {} : "skip");
  const join = useMutation(api.queue.join);
  const leave = useMutation(api.queue.leave);
  const heartbeat = useMutation(api.queue.heartbeat);
  const ghostAvailable = useQuery(api.ghosts.available, isAuthenticated ? {} : "skip");
  const startGhost = useMutation(api.ghosts.start);
  const router = useRouter();
  const now = useNow(1000);

  const [picked, setPicked] = useState<Language | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queued = status?.queued ?? null;
  const language = picked ?? queued?.language ?? savedLanguage() ?? "python";
  const rating = ratings?.find((r) => r.area === "1v1");

  // Matched: off to the duel screen.
  useEffect(() => {
    if (current) router.push(`/duel/${current._id}`);
  }, [current, router]);

  // Stay in the queue while this page is open.
  useEffect(() => {
    if (!queued) return;
    const timer = setInterval(() => void heartbeat().catch(() => {}), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [queued, heartbeat]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function pick(id: Language) {
    setPicked(id);
    // Switching while queued keeps your place.
    if (queued) void run(() => join({ language: id }));
  }

  if (status === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;

  const offerGhost =
    ghostAvailable === true &&
    current === null &&
    (queued ? now - queued.joinedAt >= GHOST_AFTER_MS : status.waiting === 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl sm:text-4xl">Play</h1>
      <div className="mt-4">
        <PlayTabs />
      </div>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Same problem for both players; the first to pass every test wins.
      </p>

      <section className="mt-8">
        <LanguagePicker value={language} onChange={pick} disabled={busy} />
        <p className="mt-3 text-[13px] text-muted-foreground">
          Your opponent may pick another; slower languages get more time per test.
        </p>
      </section>

      <div className="mt-8">
        <ChallengeLists language={language} />
      </div>

      {/* Two choices of equal weight (plan, Play modes). */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-md border p-6">
          <h2 className="text-lg font-medium">Find a match</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Ranked. You&apos;re matched by 1v1 rating, and the range widens the longer you wait.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            {queued ? (
              <>
                <div role="status" className="flex items-center gap-3">
                  <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                  <span className="text-[13px]">Looking for an opponent…</span>
                  <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
                    {clock(now - queued.joinedAt)}
                  </span>
                </div>
                <Button variant="outline" className="ml-auto" disabled={busy} onClick={() => run(() => leave())}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="brand" disabled={busy || current !== null} onClick={() => run(() => join({ language }))}>
                  Find a match
                </Button>
                <span className="text-[13px] text-muted-foreground">
                  {status.waiting === 0
                    ? "Nobody is waiting right now."
                    : `${status.waiting} ${status.waiting === 1 ? "player is" : "players are"} waiting.`}
                </span>
              </>
            )}
          </div>
          {offerGhost && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4 text-[13px]">
              <span className="text-muted-foreground">
                {queued ? "Still waiting?" : "Nobody to play right now?"} Race a recorded solve by a player near your
                rating. No rating change.
              </span>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => startGhost({ language }))}>
                Race a ghost
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-destructive">
              {error}
            </p>
          )}
        </section>
        <section className="rounded-md border p-6">
          <h2 className="text-lg font-medium">Challenge someone</h2>
          <p className="mt-1 mb-4 text-[13px] text-muted-foreground">By username, or as a link to share.</p>
          <ChallengeForm language={language} />
        </section>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border bg-bg-secondary p-6">
          <p className={eyebrow}>Your 1v1 rating</p>
          {rating ? (
            <>
              <p className="mt-3 font-mono text-4xl font-medium tabular-nums">{rating.rating}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {rating.provisional
                  ? `Provisional: ${rating.games} of 10 ranked games`
                  : `${rating.tier} · ${rating.wins}W ${rating.losses}L ${rating.draws}D`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">
              No ranked games yet. Everyone starts at 1500; it shows to others after 10 games.
            </p>
          )}
        </div>
        <div className="rounded-md border p-6">
          <p className={eyebrow}>How it works</p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
            <li>Difficulty follows your ratings: easy 15 min, medium 25, hard 40.</li>
            <li>No penalty for a wrong Submit, but 10 s between Submits.</li>
            <li>At time up, the most tests passed wins.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
