"use client";

import { type Preloaded, useMutation, usePreloadedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Copy, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LessonText } from "@/components/learn/lesson-text";
import { Button } from "@/components/ui/button";
import { WindowCard } from "@/components/ui/window-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { timeLeft } from "@/lib/duration";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { eyebrow, field, LocalTime, OutLink, score, StageTag, teamSize } from "./parts";

type Page = NonNullable<FunctionReturnType<typeof api.ninjathons.get>>;
type Live = Extract<Page, { cancelled: false }>;
type Me = NonNullable<Live["me"]>;

/** Which side of the start and end the viewer's clock is on, so the page asks again as each passes. */
function clockKey(now: number, startsAt: number, endsAt: number) {
  return now < startsAt ? "before" : now < endsAt ? "during" : "after";
}

/**
 * One ninjathon (decisions §19): the overview and registration before the
 * start, the brief, your team and your project while it runs, a judging
 * notice after the end, then the results.
 */
export function NinjathonPage({ preloaded, slug }: { preloaded: Preloaded<typeof api.ninjathons.get>; slug: string }) {
  const first = usePreloadedQuery(preloaded);
  const now = useNow(1000);
  const at = first ? clockKey(now, first.startsAt, first.endsAt) : undefined;
  const live = useQuery(api.ninjathons.get, { slug, at });
  const event = live === undefined ? first : live;

  if (!event) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl">Ninjathon not found</h1>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/ninjathons">All ninjathons</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Link href="/ninjathons" className="text-[13px] text-text-secondary hover:underline">
        ← All ninjathons
      </Link>
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className={eyebrow}>Ninjathon</p>
          <StageTag stage={event.stage} />
        </div>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">{event.title}</h1>
        {event.teaser && <p className="mt-2 max-w-3xl text-base text-text-secondary">{event.teaser}</p>}
        {!event.cancelled && <Clock stage={event.stage} startsAt={event.startsAt} endsAt={event.endsAt} now={now} />}
      </header>

      {event.cancelled ? (
        <p className="mt-8 border p-6 text-[13px] text-muted-foreground">This ninjathon was cancelled.</p>
      ) : (
        <Body event={event} />
      )}
    </div>
  );
}

function Clock({ stage, startsAt, endsAt, now }: { stage: string; startsAt: number; endsAt: number; now: number }) {
  const text =
    stage === "upcoming"
      ? `Starts in ${timeLeft(startsAt - now)}`
      : stage === "running"
        ? `${timeLeft(endsAt - now)} left`
        : stage === "judging"
          ? "Handed in. The judges are scoring."
          : null;
  return text ? <p className="mt-3 font-mono text-[13px] text-muted-foreground tabular-nums">{text}</p> : null;
}

function Body({ event }: { event: Live }) {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-8">
        {event.results && <Results event={event} />}
        {event.stage === "running" && event.me && <SubmissionForm event={event} me={event.me} />}
        {(event.stage === "judging" || event.stage === "results") && event.me && <OwnProject me={event.me} />}
        <section>
          <h2 className="text-xl">The brief</h2>
          {event.brief !== null ? (
            <div className="mt-4">
              <LessonText>{event.brief}</LessonText>
            </div>
          ) : (
            <p className="mt-3 border bg-bg-secondary p-6 text-[13px] text-muted-foreground">
              The brief appears here at the start, <LocalTime at={event.startsAt} />, so everyone starts together.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <TeamPanel event={event} />
        <Facts event={event} />
      </aside>
    </div>
  );
}

function Facts({ event }: { event: Live }) {
  return (
    <WindowCard file="details.exe" color="plain" bodyClassName="block space-y-6 p-6 text-[13px]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Starts</dt>
        <dd>
          <LocalTime at={event.startsAt} />
        </dd>
        <dt className="text-muted-foreground">Ends</dt>
        <dd>
          <LocalTime at={event.endsAt} />
        </dd>
        <dt className="text-muted-foreground">Teams</dt>
        <dd>{teamSize(event.minTeam, event.maxTeam)}</dd>
        <dt className="text-muted-foreground">Registered</dt>
        <dd className="font-mono tabular-nums">{event.teams}</dd>
      </dl>
      {event.prizes.length > 0 && (
        <div>
          <p className={eyebrow}>Prizes</p>
          <ol className="mt-2 space-y-1">
            {event.prizes.map((prize, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 font-mono text-muted-foreground tabular-nums">{ordinal(i + 1)}</span>
                <span>{prize}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div>
        <p className={eyebrow}>Judged on</p>
        <ul className="mt-2 space-y-2">
          {event.rubric.map((c) => (
            <li key={c.name}>
              <p className="flex justify-between gap-3">
                <span className="font-medium">{c.name}</span>
                <span className="font-mono text-muted-foreground tabular-nums">{c.weight}%</span>
              </p>
              {c.description && <p className="text-muted-foreground">{c.description}</p>}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        XP: 200 for handing in a project, plus 1,000, 750 or 500 for the top three.
      </p>
    </WindowCard>
  );
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

// --- Your team ---

function useRun() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run };
}

function Alert({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-3 text-[13px] text-destructive">
      {error}
    </p>
  ) : null;
}

function TeamPanel({ event }: { event: Live }) {
  if (event.me) return <TeamCard event={event} me={event.me} />;
  if (event.stage !== "upcoming") {
    return event.stage === "running" ? (
      <p className="border p-6 text-[13px] text-muted-foreground">Registration closed at the start.</p>
    ) : null;
  }
  if (!event.signedIn) {
    return (
      <WindowCard file="take_part.exe" color="blue" bodyClassName="block p-6 text-[13px]">
        <p className={eyebrow}>Take part</p>
        <p className="mt-2 text-muted-foreground">Sign in to create a team or join one with its code.</p>
        <Button variant="brand" className="mt-4" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </WindowCard>
    );
  }
  return <Register event={event} />;
}

function Register({ event }: { event: Live }) {
  const createTeam = useMutation(api.ninjathons.createTeam);
  const joinTeam = useMutation(api.ninjathons.joinTeam);
  const { error, busy, run } = useRun();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const solo = event.minTeam === 1;

  return (
    <WindowCard file="take_part.exe" color="blue" bodyClassName="block p-6 text-[13px]">
      <p className={eyebrow}>Take part</p>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => createTeam({ eventId: event._id, name }));
        }}
      >
        <label htmlFor="team-name" className="block font-medium">
          {solo ? "Create a team (a team of one counts)" : "Create a team"}
        </label>
        <input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          placeholder="Team name"
          className={cn(field, "h-9")}
        />
        <Button type="submit" variant="brand" disabled={busy || name.trim().length < 3}>
          Create team
        </Button>
      </form>
      <form
        className="mt-6 space-y-2 border-t pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => joinTeam({ inviteCode: code }));
        }}
      >
        <label htmlFor="team-code" className="block font-medium">
          Or join one with its code
        </label>
        <input
          id="team-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={12}
          placeholder="ABCD2345"
          autoCapitalize="characters"
          className={cn(field, "h-9 font-mono tracking-[0.12em] uppercase")}
        />
        <Button type="submit" variant="outline" disabled={busy || code.trim().length === 0}>
          Join team
        </Button>
      </form>
      <Alert error={error} />
      <p className="mt-4 text-xs text-muted-foreground">Teams lock at the start: no joining, leaving or renaming after that.</p>
    </WindowCard>
  );
}

function TeamCard({ event, me }: { event: Live; me: Me }) {
  const rename = useMutation(api.ninjathons.renameTeam);
  const newCode = useMutation(api.ninjathons.newInviteCode);
  const removeMember = useMutation(api.ninjathons.removeMember);
  const leave = useMutation(api.ninjathons.leaveTeam);
  const { error, busy, run } = useRun();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<"leave" | Id<"users"> | null>(null);
  const open = event.stage === "upcoming";
  const short = me.members.length < event.minTeam;

  async function copy() {
    await navigator.clipboard.writeText(me.inviteCode!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <WindowCard file="your_team.exe" color="blue" bodyClassName="block p-6 text-[13px]">
      <p className={eyebrow}>Your team</p>
      {editing ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => rename({ teamId: me.teamId, name })).then((ok) => ok && setEditing(false));
          }}
        >
          <input aria-label="Team name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} autoFocus className={cn(field, "h-8")} />
          <Button type="submit" size="sm" disabled={busy}>
            Save
          </Button>
        </form>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">{me.name}</h2>
          {open && me.isCaptain && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Rename
            </Button>
          )}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {me.members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3">
            {m.imageUrl ? (
              // Clerk avatar URLs; next/image would need every Clerk host configured.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.imageUrl} alt="" className="size-6 rounded-full bg-bg-tertiary" />
            ) : (
              <span className="size-6 rounded-full bg-bg-tertiary" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {m.username ? `@${m.username}` : m.name}
              {m.isCaptain && <span className="ml-2 text-xs text-muted-foreground">Captain</span>}
            </span>
            {open && me.isCaptain && !m.isCaptain && (
              confirming === m.userId ? (
                <Button variant="destructive" size="xs" disabled={busy} onClick={() => run(() => removeMember({ teamId: me.teamId, userId: m.userId }))}>
                  Remove?
                </Button>
              ) : (
                <Button variant="ghost" size="xs" onClick={() => setConfirming(m.userId)}>
                  Remove
                </Button>
              )
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
        {me.members.length} of {event.maxTeam}
      </p>

      {short && (
        <p className="mt-3 rounded-sm bg-bg-secondary p-3 text-text-secondary">
          {open
            ? `This ninjathon needs at least ${event.minTeam} per team. Under that at the start, your team can't hand in a project.`
            : `Your team is under the minimum of ${event.minTeam}, so it can't hand in a project.`}
        </p>
      )}

      {me.inviteCode && (
        <div className="mt-4 border-t pt-4">
          <p className={eyebrow}>Invite code</p>
          <p className="mt-2 font-mono text-xl font-medium tracking-[0.12em]">{me.inviteCode}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
            {me.isCaptain && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => newCode({ teamId: me.teamId }))}>
                New code
              </Button>
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="mt-4 border-t pt-4">
          {confirming === "leave" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Leave {me.name}?</span>
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => run(() => leave({ teamId: me.teamId }))}>
                Leave
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                Stay
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming("leave")}>
              Leave team
            </Button>
          )}
        </div>
      )}
      <Alert error={error} />
    </WindowCard>
  );
}

// --- Your project ---

function SubmissionForm({ event, me }: { event: Live; me: Me }) {
  const save = useMutation(api.ninjathons.saveSubmission);
  const { error, busy, run } = useRun();
  const saved = me.submission;
  const [draft, setDraft] = useState({
    projectName: saved?.projectName ?? "",
    repoUrl: saved?.repoUrl ?? "",
    demoUrl: saved?.demoUrl ?? "",
    description: saved?.description ?? "",
  });
  const [done, setDone] = useState(false);
  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDone(false);
    setDraft({ ...draft, [key]: e.target.value });
  };
  const short = me.members.length < event.minTeam;

  return (
    <WindowCard as="section" file="your_project.exe" color="blue" bodyClassName="block p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">Your project</h2>
        <p className="text-xs text-muted-foreground">
          {saved ? (
            <>
              Last saved <LocalTime at={saved.savedAt} />
            </>
          ) : (
            "Not handed in yet"
          )}
        </p>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Anyone on the team can edit it until <LocalTime at={event.endsAt} />. Other teams see it once results are out.
      </p>
      <form
        className="mt-5 grid gap-4 text-[13px]"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => save({ teamId: me.teamId, ...draft })).then((ok) => ok && setDone(true));
        }}
      >
        <Field id="p-name" label="Project name">
          <input id="p-name" value={draft.projectName} onChange={set("projectName")} maxLength={60} className={cn(field, "h-9")} />
        </Field>
        <Field id="p-repo" label="Repository link" hint="https://, for example a public GitHub repository">
          <input id="p-repo" type="url" value={draft.repoUrl} onChange={set("repoUrl")} placeholder="https://github.com/…" className={cn(field, "h-9")} />
        </Field>
        <Field id="p-demo" label="Demo video link" hint="A short video: YouTube, Loom or similar">
          <input id="p-demo" type="url" value={draft.demoUrl} onChange={set("demoUrl")} placeholder="https://…" className={cn(field, "h-9")} />
        </Field>
        <Field id="p-desc" label="Description" hint={`${draft.description.length} of 1,000`}>
          <textarea id="p-desc" value={draft.description} onChange={set("description")} maxLength={1000} rows={5} className={cn(field, "py-2")} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="brand" disabled={busy || short}>
            {saved ? "Save changes" : "Hand in"}
          </Button>
          {done && (
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Check className="size-4 text-brand-text" aria-hidden /> Saved
            </span>
          )}
        </div>
      </form>
      <Alert error={error} />
    </WindowCard>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function OwnProject({ me }: { me: Me }) {
  const s = me.submission;
  return (
    <WindowCard as="section" file="your_project.exe" color="plain" bodyClassName="block p-6 text-[13px]">
      <h2 className="text-xl">Your project</h2>
      {s ? (
        <div className="mt-3 space-y-2">
          <p className="text-base font-medium">{s.projectName}</p>
          <p className="flex flex-wrap gap-x-4">
            <OutLink href={s.repoUrl} label="Repository" />
            <OutLink href={s.demoUrl} label="Demo" />
          </p>
          {s.description && <p className="whitespace-pre-line text-text-secondary">{s.description}</p>}
        </div>
      ) : (
        <p className="mt-2 text-muted-foreground">Your team didn&apos;t hand in a project.</p>
      )}
    </WindowCard>
  );
}

// --- Results ---

function Results({ event }: { event: Live }) {
  const results = event.results!;
  return (
    <section>
      <h2 className="text-xl">Results</h2>
      {results.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">No projects were placed.</p>
      ) : (
        <ol className="mt-4 space-y-5">
          {results.map((r) => (
            <WindowCard
              as="li"
              key={r.place}
              file={`place_${r.place}.exe`}
              color={r.place === 1 ? "yellow" : "plain"}
              bodyClassName="block p-5 text-[13px]"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 font-mono text-base font-medium tabular-nums">
                  {r.place <= 3 && <Trophy className={cn("size-4", r.place === 1 ? "text-brand-text" : "text-muted-foreground")} aria-hidden />}
                  {ordinal(r.place)}
                </span>
                <span className="text-base font-medium">{r.project?.projectName ?? r.teamName}</span>
                {r.project && <span className="text-muted-foreground">by {r.teamName}</span>}
                <span className="ml-auto font-mono text-base tabular-nums">{score(r.score)}</span>
              </div>
              {r.members.length > 0 && (
                <p className="mt-2 text-muted-foreground">
                  {r.members.map((m, i) => (
                    <span key={m.userId}>
                      {i > 0 && ", "}
                      {m.username ? (
                        <Link href={`/u/${m.username}`} className="hover:underline">
                          @{m.username}
                        </Link>
                      ) : (
                        m.name
                      )}
                    </span>
                  ))}
                </p>
              )}
              {r.project && (
                <>
                  <p className="mt-2 flex flex-wrap gap-x-4">
                    <OutLink href={r.project.repoUrl} label="Repository" />
                    <OutLink href={r.project.demoUrl} label="Demo" />
                  </p>
                  {r.project.description && <p className="mt-2 whitespace-pre-line text-text-secondary">{r.project.description}</p>}
                </>
              )}
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                {event.rubric.map((c, i) => (
                  <div key={c.name} className="flex gap-1.5">
                    <dt>{c.name}</dt>
                    <dd className="font-mono text-foreground tabular-nums">{score(r.criteria[i])}</dd>
                  </div>
                ))}
              </dl>
            </WindowCard>
          ))}
        </ol>
      )}
    </section>
  );
}
