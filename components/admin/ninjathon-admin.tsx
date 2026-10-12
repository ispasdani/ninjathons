"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { eyebrow, field, LocalTime, OutLink, score, StageTag } from "@/components/ninjathons/parts";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

import { NinjathonEditor } from "./ninjathon-editor";

type Event = NonNullable<FunctionReturnType<typeof api.ninjathonsAdmin.get>>;
type Submission = FunctionReturnType<typeof api.ninjathonsAdmin.submissions>[number];

/** One ninjathon for admins: publish or cancel it, edit it, then judge it (decisions §19). */
export function AdminNinjathon({ eventId }: { eventId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const event = useQuery(api.ninjathonsAdmin.get, isAuthenticated ? { eventId } : "skip");
  const [tab, setTab] = useState<"details" | "judging" | null>(null);

  if (event === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  if (event === null) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl">Ninjathon not found</h1>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/admin/ninjathons">Ninjathons</Link>
        </Button>
      </div>
    );
  }
  const judging = event.stage === "judging" || event.stage === "results";
  const current = tab ?? (judging ? "judging" : "details");

  return (
    <div className="max-w-5xl">
      <Link href="/admin/ninjathons" className="text-[13px] text-text-secondary hover:underline">
        ← Ninjathons
      </Link>
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className={eyebrow}>Admin</p>
          <StageTag stage={event.stage} />
        </div>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">{event.title}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          <LocalTime at={event.startsAt} /> to <LocalTime at={event.endsAt} />
          {event.stage !== "draft" && event.stage !== "cancelled" && (
            <>
              {" · "}
              <Link href={`/ninjathons/${event.slug}`} className="text-brand-text underline">
                Public page
              </Link>
            </>
          )}
        </p>
      </header>

      <Actions event={event} />

      <div className="mt-8">
        <Segmented
          label="Section"
          value={current}
          onChange={setTab}
          options={[
            ["details", "Details"],
            ["judging", "Judging"],
          ]}
        />
      </div>
      {current === "details" ? (
        <NinjathonEditor key={event._id} eventId={event._id} event={event} />
      ) : (
        <Judging event={event} />
      )}
    </div>
  );
}

function Actions({ event }: { event: Event }) {
  const publish = useMutation(api.ninjathonsAdmin.publish);
  const cancel = useMutation(api.ninjathonsAdmin.cancel);
  const [confirming, setConfirming] = useState<"publish" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setConfirming(null);
    }
  }

  if (event.stage === "results" || event.stage === "cancelled") return null;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px]">
      {event.stage === "draft" &&
        (confirming === "publish" ? (
          <>
            <span>Publish it? Registration opens at once, and the address is fixed.</span>
            <Button variant="brand" size="sm" onClick={() => run(() => publish({ eventId: event._id }))}>
              Publish
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
              Not yet
            </Button>
          </>
        ) : (
          <Button variant="brand" size="sm" onClick={() => setConfirming("publish")}>
            Publish
          </Button>
        ))}
      {confirming === "cancel" ? (
        <>
          <span>Cancel this ninjathon? Its page will say it was cancelled.</span>
          <Button variant="destructive" size="sm" onClick={() => run(() => cancel({ eventId: event._id }))}>
            Cancel it
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
            Keep it
          </Button>
        </>
      ) : (
        confirming === null && (
          <Button variant="ghost" size="sm" onClick={() => setConfirming("cancel")}>
            Cancel ninjathon
          </Button>
        )
      )}
      {error && (
        <p role="alert" className="w-full text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// --- Judging ---

function Judging({ event }: { event: Event }) {
  const submissions = useQuery(api.ninjathonsAdmin.submissions, { eventId: event._id });
  const publishResults = useMutation(api.ninjathonsAdmin.publishResults);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (event.stage !== "judging" && event.stage !== "results") {
    return (
      <p className="mt-6 rounded-md border p-6 text-[13px] text-muted-foreground">
        Judging opens at the end, <LocalTime at={event.endsAt} />.
      </p>
    );
  }
  if (submissions === undefined) return <p className="mt-6 text-[13px] text-muted-foreground">Loading…</p>;

  const open = event.stage === "judging";
  const waiting = submissions.filter((s) => !s.disqualified && s.sheets === 0).length;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-bg-secondary px-4 py-3 text-[13px]">
        <span className="font-mono tabular-nums">{submissions.length} projects</span>
        <span className="font-mono tabular-nums">{submissions.filter((s) => s.mine).length} scored by you</span>
        {waiting > 0 && <span className="text-muted-foreground">{waiting} with no score sheet yet</span>}
        {open && (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {confirming ? (
              <>
                <span>Publish results? This places the teams and gives XP, and can&apos;t be undone.</span>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={async () => {
                    setError(null);
                    try {
                      await publishResults({ eventId: event._id });
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setConfirming(false);
                    }
                  }}
                >
                  Publish results
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Not yet
                </Button>
              </>
            ) : (
              <Button variant="brand" size="sm" disabled={waiting > 0} onClick={() => setConfirming(true)}>
                Publish results
              </Button>
            )}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      {submissions.length === 0 ? (
        <p className="rounded-md border p-6 text-[13px] text-muted-foreground">No team handed in a project.</p>
      ) : (
        <ul className="space-y-4">
          {submissions.map((s) => (
            <li key={s._id}>
              <ScoreSheet event={event} submission={s} open={open} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreSheet({ event, submission: s, open }: { event: Event; submission: Submission; open: boolean }) {
  const save = useMutation(api.ninjathonsAdmin.score);
  const disqualify = useMutation(api.ninjathonsAdmin.disqualify);
  const [scores, setScores] = useState<(number | null)[]>(() => s.mine?.scores ?? event.rubric.map(() => null));
  const [note, setNote] = useState(s.mine?.note ?? "");
  const [reason, setReason] = useState("");
  const [dq, setDq] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const complete = scores.every((x) => x !== null);
  const total = complete ? event.rubric.reduce((sum, c, i) => sum + c.weight * scores[i]!, 0) / 10 : null;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  }

  return (
    <article className={cn("rounded-md border p-5 text-[13px]", s.disqualified && "opacity-70")}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="text-base font-medium">{s.projectName}</h3>
        <span className="text-muted-foreground">
          {s.teamName} · {s.members.map((m) => (m.username ? `@${m.username}` : m.name)).join(", ")}
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
          {s.sheets} {s.sheets === 1 ? "sheet" : "sheets"}
        </span>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4">
        <OutLink href={s.repoUrl} label="Repository" />
        <OutLink href={s.demoUrl} label="Demo" />
        <span className="text-muted-foreground">
          Last saved <LocalTime at={s.savedAt} />
        </span>
      </p>
      {s.description && <p className="mt-2 whitespace-pre-line text-text-secondary">{s.description}</p>}

      {s.disqualified ? (
        <div className="mt-4 rounded-sm bg-bg-secondary p-3">
          <p>
            <span className="font-medium">Disqualified:</span> {s.disqualified.reason}
          </p>
          {open && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => run(() => disqualify({ submissionId: s._id, reason: null }))}>
              Lift disqualification
            </Button>
          )}
        </div>
      ) : (
        <form
          className="mt-4 space-y-3 border-t pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!complete) return;
            void run(() => save({ submissionId: s._id, scores: scores as number[], note })).then((ok) => setDone(ok));
          }}
        >
          <fieldset disabled={!open} className="space-y-3">
            {event.rubric.map((c, i) => (
              <div key={c.name} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="w-40">
                  {c.name} <span className="font-mono text-xs text-muted-foreground">{c.weight}%</span>
                </span>
                <div role="radiogroup" aria-label={`${c.name} score`} className="flex flex-wrap gap-1">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={scores[i] === n}
                      onClick={() => {
                        setDone(false);
                        setScores(scores.map((x, j) => (j === i ? n : x)));
                      }}
                      className="size-7 rounded-sm border font-mono text-xs tabular-nums hover:border-border-strong aria-checked:border-foreground aria-checked:bg-foreground aria-checked:text-background"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <textarea
              aria-label="Private note"
              value={note}
              onChange={(e) => {
                setDone(false);
                setNote(e.target.value);
              }}
              maxLength={1000}
              rows={2}
              placeholder="Private note (only admins see it)"
              className={cn(field, "py-2")}
            />
          </fieldset>
          {open && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={!complete}>
                {s.mine ? "Update score" : "Save score"}
              </Button>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {total === null ? "Score every criterion" : `Your total: ${score(total)} of 100`}
              </span>
              {done && <Check className="size-4 text-brand-text" aria-label="Saved" />}
              <span className="ml-auto">
                {dq ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <input
                      aria-label="Reason (only admins see it)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      placeholder="Reason (only admins see it)"
                      className={cn(field, "h-8 w-64")}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={reason.trim().length === 0}
                      onClick={() => run(() => disqualify({ submissionId: s._id as Id<"ninjathonSubmissions">, reason }))}
                    >
                      Disqualify
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDq(false)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDq(true)}>
                    Disqualify…
                  </Button>
                )}
              </span>
            </div>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
