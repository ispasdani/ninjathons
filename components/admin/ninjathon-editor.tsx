"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { LessonText } from "@/components/learn/lesson-text";
import { eyebrow, field } from "@/components/ninjathons/parts";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Event = NonNullable<FunctionReturnType<typeof api.ninjathonsAdmin.get>>;

const HOUR = 60 * 60 * 1000;

/** A time as a datetime-local value in the admin's own time zone. */
function toLocalInput(time: number) {
  const d = new Date(time - new Date(time).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return new Date(value).getTime();
}

function blank() {
  // Next Saturday, 10:00 local, for 48 hours.
  const start = new Date();
  start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7));
  start.setHours(10, 0, 0, 0);
  return {
    slug: "",
    title: "",
    teaser: "",
    brief: "",
    startsAt: start.getTime(),
    endsAt: start.getTime() + 48 * HOUR,
    minTeam: 1,
    maxTeam: 4,
    rubric: [
      { name: "Idea", description: "How original and useful is it?", weight: 30 },
      { name: "Execution", description: "Does it work, and is the code sound?", weight: 50 },
      { name: "Demo", description: "How well does the demo show it?", weight: 20 },
    ],
    prizes: [] as string[],
  };
}

/**
 * Creating or editing a ninjathon (decisions §19). Every field can change
 * until the start; the address only while it's a draft. The server checks
 * everything again.
 */
export function NinjathonEditor({ eventId, event }: { eventId: string | null; event?: Event }) {
  const router = useRouter();
  const create = useMutation(api.ninjathonsAdmin.create);
  const update = useMutation(api.ninjathonsAdmin.update);
  const [draft, setDraft] = useState(() => {
    if (!event) return blank();
    const { slug, title, teaser, brief, startsAt, endsAt, minTeam, maxTeam, rubric, prizes } = event;
    return { slug, title, teaser, brief, startsAt, endsAt, minTeam, maxTeam, rubric, prizes };
  });
  const [view, setView] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // Times are shown in the admin's own time zone, which the server doesn't know.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const locked = event !== undefined && event.stage !== "draft" && event.stage !== "upcoming";
  const slugFixed = event !== undefined && event.stage !== "draft";
  const weights = draft.rubric.reduce((sum, c) => sum + (Number.isFinite(c.weight) ? c.weight : 0), 0);
  const hours = (draft.endsAt - draft.startsAt) / HOUR;

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      if (eventId && event) {
        await update({ eventId: event._id, ...draft });
        setSaved(true);
      } else {
        const id = await create(draft);
        router.push(`/admin/ninjathons/${id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return <p className="text-[13px] text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-4xl">
      {!event && (
        <>
          <Link href="/admin/ninjathons" className="text-[13px] text-text-secondary hover:underline">
            ← Ninjathons
          </Link>
          <header className="mt-4">
            <p className={eyebrow}>Admin</p>
            <h1 className="mt-2 text-3xl sm:text-4xl">New ninjathon</h1>
            <p className="mt-2 text-[13px] text-muted-foreground">Saved as a draft: only admins see it until you publish.</p>
          </header>
        </>
      )}
      {locked && (
        <p className="mt-6 rounded-md border bg-bg-secondary p-4 text-[13px] text-text-secondary">
          This ninjathon has started, so its details are fixed.
        </p>
      )}

      <fieldset disabled={locked} className="mt-8 grid gap-6 text-[13px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="e-title" label="Title">
            <input id="e-title" value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={80} className={cn(field, "h-9")} />
          </Field>
          <Field id="e-slug" label="Address" hint={slugFixed ? "Fixed once published" : "/ninjathons/…"}>
            <input
              id="e-slug"
              value={draft.slug}
              disabled={slugFixed}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              maxLength={60}
              className={cn(field, "h-9 font-mono disabled:opacity-60")}
            />
          </Field>
        </div>
        <Field id="e-teaser" label="Teaser" hint="One line, shown before the start">
          <input id="e-teaser" value={draft.teaser} onChange={(e) => set("teaser", e.target.value)} maxLength={160} className={cn(field, "h-9")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="e-start" label="Starts" hint="Your time zone">
            <input
              id="e-start"
              type="datetime-local"
              value={toLocalInput(draft.startsAt)}
              onChange={(e) => {
                const startsAt = fromLocalInput(e.target.value);
                if (!Number.isFinite(startsAt)) return;
                // Keep the length when the start moves.
                setSaved(false);
                setDraft((d) => ({ ...d, startsAt, endsAt: startsAt + (d.endsAt - d.startsAt) }));
              }}
              className={cn(field, "h-9")}
            />
          </Field>
          <Field id="e-end" label="Ends" hint={Number.isFinite(hours) ? `${Math.round(hours * 10) / 10} hours (1 to 168)` : undefined}>
            <input
              id="e-end"
              type="datetime-local"
              value={toLocalInput(draft.endsAt)}
              onChange={(e) => {
                const endsAt = fromLocalInput(e.target.value);
                if (Number.isFinite(endsAt)) set("endsAt", endsAt);
              }}
              className={cn(field, "h-9")}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="e-min" label="Smallest team" hint="1 allows solo entries">
            <input id="e-min" type="number" min={1} max={6} value={draft.minTeam} onChange={(e) => set("minTeam", Number(e.target.value))} className={cn(field, "h-9")} />
          </Field>
          <Field id="e-max" label="Largest team" hint="Up to 6">
            <input id="e-max" type="number" min={1} max={6} value={draft.maxTeam} onChange={(e) => set("maxTeam", Number(e.target.value))} className={cn(field, "h-9")} />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">Brief</span>
            <Segmented
              label="Brief view"
              value={view}
              onChange={setView}
              options={[
                ["write", "Write"],
                ["preview", "Preview"],
              ]}
            />
          </div>
          {view === "write" ? (
            <textarea
              aria-label="Brief"
              value={draft.brief}
              onChange={(e) => set("brief", e.target.value)}
              rows={14}
              placeholder="Markdown. Players see it only from the start."
              className={cn(field, "py-2 font-mono")}
            />
          ) : (
            <div className="min-h-40 rounded-md border p-6">
              {draft.brief ? <LessonText>{draft.brief}</LessonText> : <p className="text-muted-foreground">Nothing yet.</p>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">Rubric</span>
            <span className={cn("font-mono text-xs tabular-nums", weights === 100 ? "text-muted-foreground" : "text-destructive")}>
              Weights: {weights} of 100
            </span>
          </div>
          <ul className="space-y-2">
            {draft.rubric.map((c, i) => (
              <li key={i} className="grid grid-cols-[1fr_5rem_auto] gap-2 sm:grid-cols-[12rem_1fr_5rem_auto]">
                <input
                  aria-label={`Criterion ${i + 1} name`}
                  value={c.name}
                  maxLength={40}
                  placeholder="Name"
                  onChange={(e) => set("rubric", draft.rubric.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className={cn(field, "h-9")}
                />
                <input
                  aria-label={`Criterion ${i + 1} description`}
                  value={c.description}
                  maxLength={200}
                  placeholder="What the judges look for"
                  onChange={(e) => set("rubric", draft.rubric.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                  className={cn(field, "order-last col-span-3 h-9 sm:order-none sm:col-span-1")}
                />
                <input
                  aria-label={`Criterion ${i + 1} weight`}
                  type="number"
                  min={1}
                  max={100}
                  value={c.weight}
                  onChange={(e) => set("rubric", draft.rubric.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))}
                  className={cn(field, "h-9 font-mono")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove criterion ${i + 1}`}
                  disabled={draft.rubric.length <= 2}
                  onClick={() => set("rubric", draft.rubric.filter((_, j) => j !== i))}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          {draft.rubric.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set("rubric", [...draft.rubric, { name: "", description: "", weight: 0 }])}
            >
              <Plus aria-hidden /> Criterion
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <span className="font-medium">Prizes</span>
          <ol className="space-y-2">
            {draft.prizes.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-8 font-mono text-muted-foreground tabular-nums">{i + 1}.</span>
                <input
                  aria-label={`Prize for place ${i + 1}`}
                  value={p}
                  maxLength={200}
                  onChange={(e) => set("prizes", draft.prizes.map((x, j) => (j === i ? e.target.value : x)))}
                  className={cn(field, "h-9")}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove prize ${i + 1}`} onClick={() => set("prizes", draft.prizes.filter((_, j) => j !== i))}>
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          {draft.prizes.length < 10 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set("prizes", [...draft.prizes, ""])}>
              <Plus aria-hidden /> Prize
            </Button>
          )}
        </div>
      </fieldset>

      {!locked && (
        <div className="mt-8 flex items-center gap-3 border-t pt-6">
          <Button variant={event ? "default" : "brand"} disabled={busy} onClick={save}>
            {event ? "Save changes" : "Create draft"}
          </Button>
          {saved && <span className="text-[13px] text-text-secondary">Saved</span>}
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function subscribeNever() {
  return () => {};
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
