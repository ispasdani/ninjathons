"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguagePicker, savedLanguage } from "@/components/play/language-picker";
import { PlayTabs } from "@/components/play/play-tabs";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
// The queue drops rows not seen for 30 s (convex/territoryQueue.ts).
const HEARTBEAT_MS = 10_000;

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Territory on the Play page: pick a language, then Find a match (ranked) or
 * open a lobby to share, on your own or for a group. Goes to the game as soon
 * as one is made.
 */
export function TerritoryPlay({ groupId }: { groupId?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.territoryQueue.status, isAuthenticated ? {} : "skip");
  const current = useQuery(api.territory.current, isAuthenticated ? {} : "skip");
  const lobby = useQuery(api.territoryLobbies.mine, isAuthenticated ? {} : "skip");
  const ratings = useQuery(api.ratings.mine, isAuthenticated ? {} : "skip");
  const groups = useQuery(api.groups.mine, isAuthenticated ? {} : "skip");
  const join = useMutation(api.territoryQueue.join);
  const leave = useMutation(api.territoryQueue.leave);
  const heartbeat = useMutation(api.territoryQueue.heartbeat);
  const openLobby = useMutation(api.territoryLobbies.create);
  const router = useRouter();
  const now = useNow(1000);

  const [picked, setPicked] = useState<Language | null>(null);
  const [ranked, setRanked] = useState<"unranked" | "ranked">("unranked");
  const [group, setGroup] = useState<string>(groupId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queued = status?.queued ?? null;
  const language = picked ?? queued?.language ?? savedLanguage() ?? "python";
  const rating = ratings?.find((r) => r.area === "territory");
  const activeGroups = (groups ?? []).filter((g) => g.deletedAt === null);

  // A game was made: off to it.
  useEffect(() => {
    if (current) router.push(`/territory/${current._id}`);
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
    if (queued) void run(() => join({ language: id }));
  }

  async function open() {
    await run(async () => {
      const code = await openLobby({
        ranked: ranked === "ranked",
        language,
        groupId: group ? (group as Id<"groups">) : undefined,
      });
      router.push(`/lobby/${code}`);
    });
  }

  if (status === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl sm:text-4xl">Play</h1>
      <div className="mt-4">
        <PlayTabs />
      </div>
      <p className="mt-4 text-[15px] text-muted-foreground">
        3 to 6 players on a hex map. Solve a problem to claim a region next to yours, or a harder one to take a
        rival&apos;s. More than half the points wins, or the most points after 30 minutes.
      </p>

      {lobby && (
        <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-md border bg-bg-secondary px-4 py-3 text-[13px]">
          <span className="size-2 rounded-full bg-brand" aria-hidden />
          <span>{lobby.isHost ? "Your lobby is open." : "You're in a lobby."}</span>
          <Link href={`/lobby/${lobby.code}`} className="ml-auto font-medium hover:underline">
            Back to the lobby
          </Link>
        </div>
      )}

      <section className="mt-8">
        <LanguagePicker value={language} onChange={pick} disabled={busy} />
        <p className="mt-3 text-[13px] text-muted-foreground">
          Everyone picks their own; slower languages get more time per test.
        </p>
      </section>

      {/* Two choices of equal weight (plan, Play modes). */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-md border p-6">
          <h2 className="text-lg font-medium">Find a match</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Ranked. A game starts with 6 players near your Territory rating, or with 3 or more after 30 seconds.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            {queued ? (
              <>
                <div role="status" className="flex items-center gap-3">
                  <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                  <span className="text-[13px]">Looking for players…</span>
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
        </section>

        <section className="flex flex-col rounded-md border p-6">
          <h2 className="text-lg font-medium">Open a lobby</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Share the link, or open it for a group so members can join from the group page. You start it once 3 are in.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Segmented
              label="Rating"
              value={ranked}
              options={[
                ["unranked", "Unranked"],
                ["ranked", "Ranked"],
              ]}
              onChange={setRanked}
            />
            {activeGroups.length > 0 && (
              <label className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground">For</span>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="h-8 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
                >
                  <option value="">Anyone with the link</option>
                  {activeGroups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {ranked === "ranked" && (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Ranked lobbies need everyone to have 10 ranked Territory games and ratings within 400.
            </p>
          )}
          <div className="mt-auto pt-6">
            <Button disabled={busy || current !== null} onClick={open}>
              Open a lobby
            </Button>
          </div>
        </section>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border bg-bg-secondary p-6">
          <p className={eyebrow}>Your Territory rating</p>
          {rating ? (
            <>
              <p className="mt-3 font-mono text-4xl font-medium tabular-nums">{rating.rating}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {rating.provisional
                  ? `Provisional: ${rating.games} of 10 ranked games`
                  : `${rating.tier} · ${rating.wins} wins in ${rating.games} games`}
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
            <li>Edge regions are easy (+1), then medium (+2), hard (+3), and the Core (+5).</li>
            <li>Claim an empty region at its level; attack a rival&apos;s one level harder.</li>
            <li>New captures are shielded for 60 s; home bases can&apos;t be taken.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
