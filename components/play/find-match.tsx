"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
// The queue drops rows not seen for 30 s (convex/queue.ts).
const HEARTBEAT_MS = 10_000;
const LANGUAGE_KEY = "play:language";

function readLanguage(): Language | null {
  try {
    return localStorage.getItem(LANGUAGE_KEY) as Language | null;
  } catch {
    return null;
  }
}

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Find a match: pick a language, join the ranked queue, and go to the duel
 * screen as soon as the pairing pass finds an opponent.
 */
export function FindMatch() {
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.queue.status, isAuthenticated ? {} : "skip");
  const current = useQuery(api.matches.current, isAuthenticated ? {} : "skip");
  const ratings = useQuery(api.ratings.mine, isAuthenticated ? {} : "skip");
  const join = useMutation(api.queue.join);
  const leave = useMutation(api.queue.leave);
  const heartbeat = useMutation(api.queue.heartbeat);
  const router = useRouter();
  const now = useNow(1000);

  const [picked, setPicked] = useState<Language | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queued = status?.queued ?? null;
  const language = picked ?? queued?.language ?? readLanguage() ?? "python";
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
    try {
      localStorage.setItem(LANGUAGE_KEY, id);
    } catch {}
    // Switching while queued keeps your place.
    if (queued) void run(() => join({ language: id }));
  }

  if (status === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <p className={eyebrow}>1v1 race</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Find a match</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Ranked. Same problem, first to pass every test wins. You&apos;re matched by 1v1 rating, and the range widens the
        longer you wait.
      </p>

      <section className="mt-8 rounded-md border p-6">
        <p className="text-[13px] font-medium" id="language-label">
          Your language
        </p>
        <div role="radiogroup" aria-labelledby="language-label" className="mt-3 flex flex-wrap gap-2">
          {status.languages.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={language === l.id}
              onClick={() => pick(l.id)}
              disabled={busy}
              className={cn(
                "h-8 rounded-md border px-3 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:border-border-strong hover:text-foreground",
                "aria-checked:border-foreground aria-checked:font-medium aria-checked:text-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Your opponent may pick another; slower languages get more time per test.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
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
              <Button variant="brand" size="lg" disabled={busy || current !== null} onClick={() => run(() => join({ language }))}>
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
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-destructive">
            {error}
          </p>
        )}
      </section>

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
