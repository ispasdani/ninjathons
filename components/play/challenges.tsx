"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { api } from "@/convex/_generated/api";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-bg-secondary";

type DifficultyChoice = "auto" | "easy" | "medium" | "hard";

export function challengeLink(code: string) {
  return `${window.location.origin}/challenge/${code}`;
}

function minutesLeft(expiresAt: number, now: number) {
  const minutes = Math.max(1, Math.ceil((expiresAt - now) / 60_000));
  return `${minutes} min left`;
}

function Settings({ ranked, difficulty }: { ranked: boolean; difficulty: "easy" | "medium" | "hard" | null }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <span>{ranked ? "Ranked" : "Unranked"}</span>
      <span aria-hidden>·</span>
      {difficulty ? <Difficulty level={difficulty} /> : <span>Difficulty by rating</span>}
    </span>
  );
}

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(challengeLink(code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

/**
 * Challenge someone: by username, or as a link to share. Ranked or unranked,
 * shown to the other player before they accept.
 */
export function ChallengeForm({ language }: { language: Language }) {
  const create = useMutation(api.challenges.create);
  const [username, setUsername] = useState("");
  const [ranked, setRanked] = useState<"ranked" | "unranked">("unranked");
  const [difficulty, setDifficulty] = useState<DifficultyChoice>("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create({
        username: username.trim() || undefined,
        ranked: ranked === "ranked",
        difficulty: ranked === "unranked" && difficulty !== "auto" ? difficulty : undefined,
        language,
      });
      setUsername("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="challenge-username" className="text-[13px] font-medium">
          Username
        </label>
        <input
          id="challenge-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Leave empty to make a link"
          maxLength={40}
          autoComplete="off"
          className={`${inputClass} mt-2`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Ranked or unranked"
          value={ranked}
          options={[
            ["unranked", "Unranked"],
            ["ranked", "Ranked"],
          ]}
          onChange={setRanked}
        />
        {ranked === "unranked" && (
          <Segmented
            label="Difficulty"
            value={difficulty}
            options={[
              ["auto", "By rating"],
              ["easy", "Easy"],
              ["medium", "Medium"],
              ["hard", "Hard"],
            ]}
            onChange={setDifficulty}
          />
        )}
      </div>
      <p className="text-[13px] text-muted-foreground">
        {ranked === "ranked"
          ? "Ranked needs 10 ranked games each and ratings within 400. Only 3 rated games per opponent per day."
          : "Unranked never changes ratings."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {username.trim() ? "Send challenge" : "Create link"}
        </Button>
        <span className="text-[13px] text-muted-foreground">Expires after 15 minutes.</span>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

/** Challenges sent to you (Accept, Decline) and by you (Copy link, Cancel). */
export function ChallengeLists({ language }: { language: Language }) {
  const { isAuthenticated } = useConvexAuth();
  const challenges = useQuery(api.challenges.mine, isAuthenticated ? {} : "skip");
  const accept = useMutation(api.challenges.accept);
  const decline = useMutation(api.challenges.decline);
  const cancel = useMutation(api.challenges.cancel);
  const router = useRouter();
  const now = useNow(15_000);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!challenges || (challenges.incoming.length === 0 && challenges.outgoing.length === 0)) return null;

  return (
    <section className="space-y-6">
      {challenges.incoming.length > 0 && (
        <div>
          <p className={eyebrow}>Challenges for you</p>
          <ul className="mt-3 space-y-2">
            {challenges.incoming.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center gap-3 rounded-md border border-border-strong p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">@{c.from} challenges you</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Settings ranked={c.ranked} difficulty={c.difficulty} />
                    <span className="text-[13px] text-muted-foreground">· {minutesLeft(c.expiresAt, now)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => run(() => decline({ id: c._id }))}>
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    run(async () => router.push(`/duel/${await accept({ code: c.code, language })}`))
                  }
                >
                  Accept
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {challenges.outgoing.length > 0 && (
        <div>
          <p className={eyebrow}>Your challenges</p>
          <ul className="mt-3 space-y-2">
            {challenges.outgoing.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center gap-3 rounded-md border p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                    {c.to ? `Waiting for @${c.to}…` : "Link: waiting for someone to open it…"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Settings ranked={c.ranked} difficulty={c.difficulty} />
                    <span className="text-[13px] text-muted-foreground">· {minutesLeft(c.expiresAt, now)}</span>
                  </div>
                </div>
                <CopyLink code={c.code} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => run(() => cancel({ id: c._id }))}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
