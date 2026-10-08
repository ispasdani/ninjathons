"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MATCH_LANGUAGES, saveLanguage, savedLanguage } from "@/components/play/language-picker";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
// The lobby leaves out players not seen for 30 s (convex/territoryLobbies.ts).
const HEARTBEAT_MS = 10_000;
const MAX_PLAYERS = 6;

// Why the caller can't join (codes from territoryLobbies.get).
const PROBLEMS: Record<string, string> = {
  STARTED: "This lobby's game has started.",
  LOBBY_CLOSED: "This lobby has closed. Ask for a new link.",
  LOBBY_FULL: "This lobby is full (6 players).",
};
// Why the host can't start yet.
const START_PROBLEMS: Record<string, string> = {
  NOT_ENOUGH_PLAYERS: "You can start once 3 players are here.",
  TERRITORY_NEEDS_GAMES: "Everyone needs 10 ranked Territory games for a ranked game. Play Find a match to get there.",
  RATING_SPREAD: "Your ratings are 400 or more apart, too far for a ranked game.",
};

const LANGUAGE_LABELS = Object.fromEntries(MATCH_LANGUAGES);

/**
 * A Territory lobby: who's in and their languages, the link to share, and
 * Start for the host. Goes to the game the moment it starts.
 */
export function LobbyPage({ code }: { code: string }) {
  const { isAuthenticated } = useConvexAuth();
  const lobby = useQuery(api.territoryLobbies.get, isAuthenticated ? { code } : "skip");
  const join = useMutation(api.territoryLobbies.join);
  const leave = useMutation(api.territoryLobbies.leave);
  const heartbeat = useMutation(api.territoryLobbies.heartbeat);
  const start = useMutation(api.territoryLobbies.start);
  const router = useRouter();
  const now = useNow(15_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chosen, setChosen] = useState<Language | null>(null);

  const me = lobby?.players.find((p) => p.you);
  const language = chosen ?? me?.language ?? savedLanguage() ?? "python";
  const inLobby = lobby?.inLobby ?? false;

  useEffect(() => {
    if (lobby?.gameId) router.push(`/territory/${lobby.gameId}`);
  }, [lobby?.gameId, router]);

  // Stay seated while this page is open.
  useEffect(() => {
    if (!inLobby) return;
    const timer = setInterval(() => void heartbeat({ code }).catch(() => {}), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [inLobby, code, heartbeat]);

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

  function pickLanguage(id: Language) {
    setChosen(id);
    saveLanguage(id);
    if (inLobby) void run(() => join({ code, language: id }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lobby/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (lobby === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  if (lobby === null) {
    return (
      <div className="max-w-xl text-[13px] text-muted-foreground">
        <p>No lobby here. Check the link, or ask for a new one.</p>
        <Link href="/play/territory" className="mt-2 inline-block text-foreground hover:underline">
          Territory
        </Link>
      </div>
    );
  }

  const open = lobby.status === "open";
  const minutes = Math.max(1, Math.ceil((lobby.expiresAt - now) / 60_000));

  return (
    <div className="max-w-2xl">
      <p className={eyebrow}>Territory lobby</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">
        {lobby.isHost ? "Your lobby" : lobby.host ? `@${lobby.host}'s lobby` : "Lobby"}
      </h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">{lobby.ranked ? "Ranked" : "Unranked"}</span>
        {lobby.ranked ? ": changes Territory ratings." : ": no rating change."}
        {lobby.group && (
          <>
            {" "}
            For{" "}
            <Link href={`/groups/${lobby.group._id}`} className="text-foreground hover:underline">
              {lobby.group.name}
            </Link>
            .
          </>
        )}
        {open && ` Closes in ${minutes} min if not started.`}
      </p>

      {open && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border bg-bg-secondary p-4">
          <span className="font-mono text-[13px] break-all">/lobby/{lobby.code}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}

      <section className="mt-8">
        <h2 className={eyebrow}>
          Players · {lobby.players.length} of {MAX_PLAYERS}
        </h2>
        <ul className="mt-3 divide-y rounded-md border">
          {lobby.players.map((p) => (
            <li key={p.userId} className={cn("flex items-center gap-3 px-4 py-3 text-[13px]", p.away && "opacity-60")}>
              <span className="font-medium">@{p.username}</span>
              {p.host && <span className="text-muted-foreground">host</span>}
              {p.you && <span className="text-muted-foreground">you</span>}
              {p.away && <span className="text-muted-foreground">away</span>}
              <span className="ml-auto font-mono text-xs text-muted-foreground">{LANGUAGE_LABELS[p.language]}</span>
            </li>
          ))}
          {lobby.players.length === 0 && <li className="px-4 py-3 text-[13px] text-muted-foreground">Nobody yet.</li>}
        </ul>
      </section>

      {lobby.problem && !inLobby ? (
        <p className="mt-6 text-[13px] text-muted-foreground">{PROBLEMS[lobby.problem] ?? "You can't join this lobby."}</p>
      ) : (
        open && (
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="text-[13px] font-medium">
              Your language
              <select
                value={language}
                onChange={(e) => pickLanguage(e.target.value as Language)}
                disabled={busy}
                className="mt-2 block h-9 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
              >
                {MATCH_LANGUAGES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {!inLobby && (
              <Button variant="brand" disabled={busy} onClick={() => run(() => join({ code, language }))}>
                Join
              </Button>
            )}
            {lobby.isHost && (
              <Button
                variant="brand"
                disabled={busy || lobby.startProblem !== null}
                onClick={() => run(() => start({ code }))}
              >
                Start the game
              </Button>
            )}
            {inLobby && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await leave({ code });
                    router.push("/play/territory");
                  })
                }
              >
                {lobby.isHost ? "Close lobby" : "Leave"}
              </Button>
            )}
          </div>
        )
      )}
      {lobby.isHost && open && lobby.startProblem && (
        <p className="mt-3 text-[13px] text-muted-foreground">{START_PROBLEMS[lobby.startProblem]}</p>
      )}
      {!lobby.isHost && inLobby && open && (
        <p className="mt-3 text-[13px] text-muted-foreground">Waiting for the host to start.</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
