"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CodeEditor } from "@/components/solve/code-editor";
import { ProblemStatement } from "@/components/solve/problem-statement";
import { Split } from "@/components/solve/split";
import { VerdictPanel } from "@/components/solve/verdict-panel";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { clock, displayName, DuelCountdown, DuelFeed, DuelHud, DuelResult, type Match } from "./parts";

// Wrong Submits cost nothing, but 10 s apart (convex/lib/matches.ts).
const SUBMIT_COOLDOWN_MS = 10_000;

const ERRORS: Record<string, string> = {
  SUBMISSION_IN_PROGRESS: "Your previous run is still being judged.",
  SOURCE_TOO_LONG: "Your code is over 64 KB.",
  LANGUAGE_NOT_ALLOWED: "This problem can't be solved in that language.",
};

// Code is kept per match and language in this browser, so a reload loses nothing.
function draftKey(matchId: string, language: Language) {
  return `duel:${matchId}:${language}`;
}
function readDraft(matchId: string, language: Language): string | null {
  try {
    return localStorage.getItem(draftKey(matchId, language));
  } catch {
    return null;
  }
}
function writeDraft(matchId: string, language: Language, code: string) {
  try {
    localStorage.setItem(draftKey(matchId, language), code);
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

type Tab = "description" | "feed";

/** "Opponent passed 7/12 tests", bottom-right for a few seconds (design.md, toasts). */
function useOpponentToast(match: Match | null | undefined) {
  const [toast, setToast] = useState<string | null>(null);
  const seen = useRef<string | null>(null);
  const latest = match?.events.find((e) => !match.players.find((p) => p.userId === e.userId)?.you);

  useEffect(() => {
    if (!latest || !match) return;
    // The first load only remembers where the feed is.
    if (seen.current === null) {
      seen.current = latest._id;
      return;
    }
    if (seen.current === latest._id) return;
    seen.current = latest._id;
    const player = match.players.find((p) => p.userId === latest.userId);
    const name = player ? displayName(player) : "Your opponent";
    setToast(
      latest.kind === "forfeit"
        ? `${name} gave up`
        : latest.accepted
          ? `${name} passed every test`
          : `${name} passed ${latest.passed}/${latest.total} tests`,
    );
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [latest, match]);

  // Before any opponent event, mark the feed as loaded.
  useEffect(() => {
    if (match && !latest && seen.current === null) seen.current = "";
  }, [match, latest]);

  return toast;
}

/**
 * The duel screen: countdown, then the HUD over a solve-style workspace, then
 * the result. Everything follows matches.get live; the server owns the clock.
 */
export function DuelView({ matchId }: { matchId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const match = useQuery(api.matches.get, isAuthenticated ? { id: matchId } : "skip");
  const createSubmission = useMutation(api.submissions.create);
  const forfeit = useMutation(api.matches.forfeit);
  const now = useNow(250);

  const [tab, setTab] = useState<Tab>("description");
  const [language, setLanguage] = useState<Language | null>(null);
  const [code, setCode] = useState("");
  const [submissionId, setSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submission = useQuery(api.submissions.get, submissionId ? { id: submissionId } : "skip");
  const busy = submission?.status === "queued" || submission?.status === "running";
  const toast = useOpponentToast(match);

  const problem = match?.problem ?? null;
  const me = match?.players.find((p) => p.you);
  const current = problem?.languages.find((l) => l.id === language);
  const open = match?.status === "active" && !match.timeUp && now < (match?.endsAt ?? 0);
  const cooldown = me?.lastSubmitAt ? me.lastSubmitAt + SUBMIT_COOLDOWN_MS - now : 0;

  // Open the editor in the language picked before the match, with any draft.
  useEffect(() => {
    if (!problem || !me || language) return;
    const first = problem.languages.find((l) => l.id === me.language) ?? problem.languages[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load once the problem is revealed
    setLanguage(first.id);
    setCode(readDraft(matchId, first.id) ?? first.starterCode);
  }, [problem, me, language, matchId]);

  function switchLanguage(id: Language) {
    const next = problem?.languages.find((l) => l.id === id);
    if (!next) return;
    setLanguage(id);
    setCode(readDraft(matchId, id) ?? next.starterCode);
  }

  function changeCode(value: string) {
    setCode(value);
    if (language) writeDraft(matchId, language, value);
  }

  const send = useCallback(
    async (kind: "run" | "submit") => {
      if (!language || !problem || busy || !open) return;
      if (kind === "submit" && cooldown > 0) return;
      setError(null);
      try {
        setSubmissionId(
          await createSubmission({ slug: problem.slug, language, source: code, kind, matchId: match!._id }),
        );
      } catch (e) {
        const key = e instanceof ConvexError ? String(e.data) : "";
        setError(ERRORS[key] ?? errorMessage(e));
      }
    },
    [busy, code, cooldown, createSubmission, language, match, open, problem],
  );

  async function giveUp(during: "countdown" | "active") {
    const question =
      during === "countdown" ? "Leave this match? It ends with no result." : "Give up? Your opponent wins the match.";
    if (!window.confirm(question)) return;
    try {
      await forfeit({ id: match!._id });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (match === undefined) return <p className="p-6 text-[13px] text-muted-foreground">Loading…</p>;
  if (match === null) {
    return (
      <div className="p-6 text-[13px] text-muted-foreground">
        <p>This match doesn&apos;t exist, or you&apos;re not in it.</p>
        <Link href="/play" className="mt-2 inline-block text-foreground hover:underline">
          Find a match
        </Link>
      </div>
    );
  }
  if (match.status === "countdown") {
    return <DuelCountdown match={match} now={now} onLeave={() => giveUp("countdown")} />;
  }
  if (match.status === "cancelled" || !problem) {
    return (
      <div className="flex flex-1 flex-col">
        <DuelResult match={match} />
      </div>
    );
  }

  const submitLabel = cooldown > 0 ? `Submit (${Math.ceil(cooldown / 1000)})` : "Submit";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {match.status === "finished" ? (
        <DuelResult match={match} />
      ) : (
        <DuelHud match={match} now={now} onForfeit={() => giveUp("active")} />
      )}
      {match.status === "active" && match.timeUp && (
        <p role="status" className="shrink-0 border-b bg-bg-secondary px-4 py-2 text-[13px] text-muted-foreground">
          Time&apos;s up. Waiting for the last verdicts…
        </p>
      )}

      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2">
        <span className="truncate text-[13px] font-medium">{problem.title}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            aria-label="Language"
            className="h-8 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
            value={current?.id}
            onChange={(e) => switchLanguage(e.target.value as Language)}
          >
            {problem.languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="hidden font-mono text-xs text-muted-foreground tabular-nums xl:inline">
            {current?.version} · {current?.timeLimitMs} ms · {problem.memoryLimitMb} MB
          </span>
          <Button variant="outline" size="sm" disabled={busy || !open} onClick={() => send("run")} title="Ctrl + '">
            Run
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={busy || !open || cooldown > 0}
            onClick={() => send("submit")}
            title="Ctrl + Enter"
            className="min-w-20 tabular-nums"
          >
            {submitLabel}
          </Button>
        </div>
      </div>

      <Split
        direction="row"
        storageKey="solve:split"
        initial={42}
        min={25}
        max={70}
        label="Resize the problem and editor panels"
        first={
          <div className="flex min-h-0 flex-1 flex-col">
            <div role="tablist" aria-label="Match" className="flex h-10 shrink-0 items-end gap-4 border-b px-4">
              {(
                [
                  ["description", "Description"],
                  ["feed", `Match feed (${match.events.length})`],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  onClick={() => setTab(id)}
                  className="-mb-px border-b-2 border-transparent pb-2 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:text-foreground aria-selected:border-foreground aria-selected:font-medium aria-selected:text-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
            >
              {tab === "description" ? <ProblemStatement {...problem} hints={[]} /> : <DuelFeed match={match} />}
            </div>
          </div>
        }
        second={
          <Split
            direction="column"
            storageKey="solve:results"
            initial={64}
            min={25}
            max={85}
            label="Resize the editor and results panels"
            first={
              <div className="h-[420px] min-h-0 lg:h-auto lg:flex-1">
                {current && (
                  <CodeEditor
                    language={current.id}
                    value={code}
                    onChange={changeCode}
                    onRun={() => send("run")}
                    onSubmit={() => send("submit")}
                  />
                )}
              </div>
            }
            second={
              <section aria-label="Result" className="flex min-h-48 flex-1 flex-col border-t lg:min-h-0 lg:border-t-0">
                <div className="flex h-10 shrink-0 items-center justify-between border-b px-4">
                  <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Result
                  </p>
                  <p className="hidden font-mono text-xs text-muted-foreground sm:block">
                    Ctrl + &apos; run · Ctrl + Enter submit
                  </p>
                </div>
                <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-4">
                  {error ? (
                    <p className="text-[13px] text-destructive">{error}</p>
                  ) : (
                    <VerdictPanel submission={submission} rewards={false} />
                  )}
                </div>
              </section>
            }
          />
        }
      />

      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50">
        {toast && (
          <p
            className={cn(
              "flex items-center gap-2 rounded-md border bg-popover px-3 py-2 text-[13px] shadow-raised",
              "animate-in fade-in slide-in-from-bottom-2",
            )}
          >
            <span aria-hidden className="size-2 rounded-full bg-duel-opponent" />
            {toast}
          </p>
        )}
      </div>
      {/* Screen readers hear the time left once a minute, not every tick. */}
      <p className="sr-only" aria-live="polite">
        {match.status === "active" && !match.timeUp ? `${clock(Math.floor((match.endsAt - now) / 60_000) * 60_000)} left` : ""}
      </p>
    </div>
  );
}
