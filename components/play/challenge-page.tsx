"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

const LANGUAGES: [Language, string][] = [
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["java", "Java"],
  ["csharp", "C#"],
  ["cpp", "C++"],
  ["rust", "Rust"],
];

// Why the caller can't accept, in words (codes from challenges.get).
const PROBLEMS: Record<string, string> = {
  ACCEPTED: "This challenge was accepted.",
  CHALLENGE_CLOSED: "This challenge was cancelled or declined.",
  CHALLENGE_EXPIRED: "This challenge has expired. Ask for a new one.",
  OWN_CHALLENGE: "This is your challenge. Share the link; the match starts when someone accepts.",
  RANKED_NEEDS_GAMES: "Ranked challenges need 10 ranked games first. Play Find a match to get there.",
  OPPONENT_NEEDS_GAMES: "The challenger hasn't played 10 ranked games yet.",
  RATING_GAP: "Your ratings are 400 or more apart, too far for a ranked challenge.",
};

function readLanguage(): Language {
  try {
    return (localStorage.getItem("play:language") as Language | null) ?? "python";
  } catch {
    return "python";
  }
}

/** The page a challenge link opens: who sent it, the settings, and Accept. */
export function ChallengePage({ code }: { code: string }) {
  const { isAuthenticated } = useConvexAuth();
  const challenge = useQuery(api.challenges.get, isAuthenticated ? { code } : "skip");
  const accept = useMutation(api.challenges.accept);
  const router = useRouter();
  const now = useNow(15_000);
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (challenge === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  if (challenge === null) {
    return (
      <div className="max-w-xl text-[13px] text-muted-foreground">
        <p>No challenge here. Check the link, or ask for a new one.</p>
        <Link href="/play" className="mt-2 inline-block text-foreground hover:underline">
          Play
        </Link>
      </div>
    );
  }

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const matchId = await accept({ code, language });
      router.push(`/duel/${matchId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const minutes = Math.max(1, Math.ceil((challenge.expiresAt - now) / 60_000));

  return (
    <div className="max-w-xl">
      <p className={eyebrow}>Challenge</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">
        {challenge.mine ? "Your challenge" : `@${challenge.from} challenges you`}
      </h1>
      <div className="mt-6 space-y-2 rounded-md border bg-bg-secondary p-6 text-[13px]">
        <p>
          <span className="font-medium">{challenge.ranked ? "Ranked" : "Unranked"}</span>
          <span className="text-muted-foreground">
            {challenge.ranked ? ": changes both 1v1 ratings." : ": no rating change."}
          </span>
        </p>
        <p className="flex items-center gap-2">
          {challenge.difficulty ? <Difficulty level={challenge.difficulty} /> : <span>Difficulty by rating</span>}
          <span className="text-muted-foreground">· first to pass every test wins</span>
        </p>
        {challenge.problem === null && <p className="text-muted-foreground">Expires in {minutes} min.</p>}
      </div>

      {challenge.problem ? (
        <div className="mt-6 space-y-3 text-[13px]">
          <p className="text-muted-foreground">{PROBLEMS[challenge.problem] ?? "You can't accept this challenge."}</p>
          {challenge.matchId && (
            <Button asChild>
              <Link href={`/duel/${challenge.matchId}`}>Open the match</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium">
            Your language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="mt-2 block h-9 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
            >
              {LANGUAGES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="brand" disabled={busy} onClick={go}>
            Accept and start
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
