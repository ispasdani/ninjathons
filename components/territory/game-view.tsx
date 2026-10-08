"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CodeEditor } from "@/components/solve/code-editor";
import { ProblemStatement } from "@/components/solve/problem-statement";
import { Split } from "@/components/solve/split";
import { VerdictPanel } from "@/components/solve/verdict-panel";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";
import { checkTake, levelToTake, type Level, type TakeCheck } from "@/convex/lib/territoryMap";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { HexMap, regionName } from "./hex-map";
import { clock, GameCountdown, GameFeed, GameHud, GameResult, mapPlayers, nameOf, Standings, type Game } from "./parts";

// 10 s between Submits (convex/lib/territory.ts).
const SUBMIT_COOLDOWN_MS = 10_000;

const ERRORS: Record<string, string> = {
  SUBMISSION_IN_PROGRESS: "Your previous run is still being judged.",
  SOURCE_TOO_LONG: "Your code is over 64 KB.",
  LANGUAGE_NOT_ALLOWED: "This problem can't be solved in that language.",
};

// Why a region can't be taken, in words (reasons from checkTake).
const REASONS: Record<Exclude<TakeCheck, { ok: true }>["reason"], string> = {
  HOME_BASE: "Home bases can't be taken.",
  ALREADY_YOURS: "This region is yours.",
  NOT_NEXT_TO_YOURS: "Take a region next to it first.",
  SHIELDED: "Just taken: shielded for a minute.",
};

// Code is kept per game, problem and language in this browser, so a reload loses nothing.
function draftKey(gameId: string, slug: string, language: Language) {
  return `territory:${gameId}:${slug}:${language}`;
}
function readDraft(gameId: string, slug: string, language: Language): string | null {
  try {
    return localStorage.getItem(draftKey(gameId, slug, language));
  } catch {
    return null;
  }
}
function writeDraft(gameId: string, slug: string, language: Language, code: string) {
  try {
    localStorage.setItem(draftKey(gameId, slug, language), code);
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

type Tab = "problem" | "feed";

/** What the selected region needs: whether you can take it now, and the problem level that would. */
function targetFor(game: Game, me: string, index: number | null, now: number) {
  if (index === null) return null;
  const state = game.regions.map((r) => ({ owner: r.ownerId, shieldUntil: r.shieldUntil }));
  const check = checkTake(game.regions, state, me, index, now);
  const region = game.regions[index];
  const level: Level = check.ok ? check.level : levelToTake(region, region.ownerId !== undefined && region.ownerId !== me);
  return { region, check, level };
}

/**
 * The Territory screen: the countdown, then the live map and scores beside a
 * solve-style workspace for the selected region, then the result. Everything
 * follows territory.get live; the server owns the clock and the rules.
 */
export function GameView({ gameId }: { gameId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const game = useQuery(api.territory.get, isAuthenticated ? { id: gameId } : "skip");
  const createSubmission = useMutation(api.submissions.create);
  const forfeit = useMutation(api.territory.forfeit);
  const skip = useMutation(api.territory.skip);
  const now = useNow(250);

  const [tab, setTab] = useState<Tab>("problem");
  const [selected, setSelected] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language | null>(null);
  const [code, setCode] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submission = useQuery(api.submissions.get, submissionId ? { id: submissionId } : "skip");
  const busy = submission?.status === "queued" || submission?.status === "running";

  const me = game?.players.find((p) => p.you);
  const players = useMemo(() => (game ? mapPlayers(game) : []), [game]);
  const target = game && me ? targetFor(game, me.userId, selected, now) : null;
  const problem = target && game?.problems ? game.problems[target.level] : null;
  const current = problem?.languages.find((l) => l.id === language);
  const open = game?.status === "active" && !game.timeUp && now < (game?.endsAt ?? 0) && !me?.left;
  const cooldown = me?.lastSubmitAt ? me.lastSubmitAt + SUBMIT_COOLDOWN_MS - now : 0;

  const takeable = useMemo(() => {
    const set = new Set<number>();
    if (!game || !me || game.status !== "active") return set;
    const state = game.regions.map((r) => ({ owner: r.ownerId, shieldUntil: r.shieldUntil }));
    for (const region of game.regions) {
      if (checkTake(game.regions, state, me.userId, region.index, now).ok) set.add(region.index);
    }
    return set;
  }, [game, me, now]);

  // Open the editor in the language picked before the game, with any draft for this problem.
  useEffect(() => {
    if (!problem || !me) return;
    const lang = language ?? (problem.languages.find((l) => l.id === me.language) ?? problem.languages[0]).id;
    const key = `${problem.slug}:${lang}`;
    if (key === loadedFor) return;
    const starter = problem.languages.find((l) => l.id === lang)?.starterCode ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the draft when the problem or language changes
    setLanguage(lang);
    setCode(readDraft(gameId, problem.slug, lang) ?? starter);
    setLoadedFor(key);
  }, [problem, me, language, loadedFor, gameId]);

  function changeCode(value: string) {
    setCode(value);
    if (problem && language) writeDraft(gameId, problem.slug, language, value);
  }

  function select(index: number) {
    setSelected(index);
    setTab("problem");
  }

  const send = useCallback(
    async (kind: "run" | "submit") => {
      if (!language || !problem || !game || selected === null || busy || !open) return;
      if (kind === "submit" && (cooldown > 0 || !target?.check.ok)) return;
      setError(null);
      try {
        setSubmissionId(
          await createSubmission({
            slug: problem.slug,
            language,
            source: code,
            kind,
            territory: { gameId: game._id, region: selected },
          }),
        );
      } catch (e) {
        const key = e instanceof ConvexError ? String(e.data) : "";
        setError(ERRORS[key] ?? errorMessage(e));
      }
    },
    [busy, code, cooldown, createSubmission, game, language, open, problem, selected, target?.check.ok],
  );

  async function giveUp(during: "countdown" | "active") {
    const question =
      during === "countdown"
        ? "Leave this game? It's cancelled for everyone, with no result."
        : "Give up? You place last, and your regions stay on the map for others to take.";
    if (!window.confirm(question)) return;
    try {
      await forfeit({ id: game!._id });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function skipProblem(level: Level) {
    if (!window.confirm(`Skip this ${level} problem? You move on to the next one for good.`)) return;
    try {
      await skip({ id: game!._id, level });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (game === undefined) return <p className="p-6 text-[13px] text-muted-foreground">Loading…</p>;
  if (game === null || !me) {
    return (
      <div className="p-6 text-[13px] text-muted-foreground">
        <p>This game doesn&apos;t exist, or you&apos;re not in it.</p>
        <Link href="/play/territory" className="mt-2 inline-block text-foreground hover:underline">
          Territory
        </Link>
      </div>
    );
  }
  if (game.status === "countdown") {
    return <GameCountdown game={game} now={now} onLeave={() => giveUp("countdown")} />;
  }
  if (game.status === "cancelled") {
    return (
      <div className="flex flex-1 flex-col">
        <GameResult game={game} />
      </div>
    );
  }

  const finished = game.status === "finished";
  const submitLabel = cooldown > 0 ? `Submit (${Math.ceil(cooldown / 1000)})` : "Submit";
  const action = target?.check.ok ? (target.check.attack ? "Attack" : "Claim") : null;
  const owner = target?.region.ownerId ? game.players.find((p) => p.userId === target.region.ownerId) : undefined;

  const mapPanel = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-[320px] flex-1 p-3 lg:min-h-0">
        <HexMap
          regions={game.regions}
          players={players}
          takeable={takeable}
          selected={selected}
          now={now}
          onSelect={select}
        />
      </div>
      <div className="shrink-0 border-t px-4 py-3 text-[13px]" aria-live="polite">
        {target ? (
          <p>
            <span className="font-medium">{regionName(target.region)}</span>
            <span className="text-muted-foreground">
              {owner ? `, held by ${nameOf(owner)}` : ", empty"}.{" "}
              {target.check.ok
                ? `${action} it with a ${target.level} problem.`
                : REASONS[target.check.reason]}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            {finished
              ? "The final map."
              : "Pick a region next to yours (dashed) to claim it, or a rival's to attack it one level harder."}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {finished ? <GameResult game={game} /> : <GameHud game={game} now={now} onForfeit={() => giveUp("active")} />}
      {game.status === "active" && game.timeUp && (
        <p role="status" className="shrink-0 border-b bg-bg-secondary px-4 py-2 text-[13px] text-muted-foreground">
          Time&apos;s up. Waiting for the last verdicts…
        </p>
      )}
      {me.left && !finished && (
        <p role="status" className="shrink-0 border-b bg-bg-secondary px-4 py-2 text-[13px] text-muted-foreground">
          You left this game. You can watch until it ends.
        </p>
      )}

      {finished ? (
        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-4 lg:grid-cols-2">
          <div className="min-h-[360px]">{mapPanel}</div>
          <div>
            <Standings game={game} />
          </div>
        </div>
      ) : (
        <Split
          direction="row"
          storageKey="territory:split"
          initial={46}
          min={30}
          max={70}
          label="Resize the map and editor panels"
          first={
            <Split
              direction="column"
              storageKey="territory:map"
              initial={58}
              min={30}
              max={80}
              label="Resize the map and problem panels"
              first={mapPanel}
              second={
                <div className="flex min-h-0 flex-1 flex-col border-t lg:border-t-0">
                  <div role="tablist" aria-label="Game" className="flex h-10 shrink-0 items-end gap-4 border-b px-4">
                    {(
                      [
                        ["problem", problem ? problem.title : "Problem"],
                        ["feed", `Game feed (${game.events.length})`],
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
                        className="-mb-px max-w-64 truncate border-b-2 border-transparent pb-2 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:text-foreground aria-selected:border-foreground aria-selected:font-medium aria-selected:text-foreground"
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
                    {tab === "feed" ? (
                      <GameFeed game={game} />
                    ) : problem ? (
                      <ProblemStatement {...problem} hints={[]} />
                    ) : target ? (
                      <p className="text-[13px] text-muted-foreground">
                        You&apos;ve used every {target.level} problem in this game, so you can&apos;t take regions
                        that need one.
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">Pick a region on the map to see its problem.</p>
                    )}
                  </div>
                </div>
              }
            />
          }
          second={
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2">
                <span className="truncate text-[13px]">
                  {target && problem ? (
                    <>
                      <span className="font-medium">{action ?? "Practice"}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {target.level} · {game.deckLeft[target.level]} more after this
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No region picked</span>
                  )}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {target && problem && open && (
                    <Button variant="ghost" size="sm" onClick={() => skipProblem(target.level)}>
                      Skip
                    </Button>
                  )}
                  {problem && (
                    <select
                      aria-label="Language"
                      className="h-8 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
                      value={current?.id}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                    >
                      {problem.languages.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || !open || !problem}
                    onClick={() => send("run")}
                    title="Ctrl + '"
                  >
                    Run
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={busy || !open || !problem || cooldown > 0 || !target?.check.ok}
                    onClick={() => send("submit")}
                    title="Ctrl + Enter"
                    className="min-w-20 tabular-nums"
                  >
                    {submitLabel}
                  </Button>
                </div>
              </div>
              <Split
                direction="column"
                storageKey="solve:results"
                initial={64}
                min={25}
                max={85}
                label="Resize the editor and results panels"
                first={
                  <div className="h-[420px] min-h-0 lg:h-auto lg:flex-1">
                    {current && problem && (
                      <CodeEditor
                        key={loadedFor ?? undefined}
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
                    </div>
                    <div aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                      {error ? (
                        <p className="text-[13px] text-destructive">{error}</p>
                      ) : (
                        <>
                          <CaptureOutcome submission={submission} />
                          <VerdictPanel submission={submission} rewards={false} />
                        </>
                      )}
                    </div>
                  </section>
                }
              />
            </div>
          }
        />
      )}
      {/* Screen readers hear the time left once a minute, not every tick. */}
      <p className="sr-only" aria-live="polite">
        {game.status === "active" && !game.timeUp ? `${clock(Math.floor((game.endsAt - now) / 60_000) * 60_000)} left` : ""}
      </p>
    </div>
  );
}

/** What an accepted Submit did on the map. */
function CaptureOutcome({ submission }: { submission: ReturnType<typeof useQuery<typeof api.submissions.get>> }) {
  if (!submission?.territoryGameId || submission.kind !== "submit" || submission.verdict?.status !== "accepted") return null;
  const text =
    submission.territoryOutcome === "captured"
      ? "Region taken."
      : submission.territoryOutcome === "missed"
        ? "Someone got there first, so this took nothing. The problem is still yours: Submit it on another region of that level."
        : "Waiting for an earlier Submit on this region…";
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-[13px]",
        submission.territoryOutcome === "captured" && "border-duel-you text-foreground",
        submission.territoryOutcome !== "captured" && "text-muted-foreground",
      )}
    >
      {text}
    </p>
  );
}
