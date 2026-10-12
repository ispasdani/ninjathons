"use client";

import { cn } from "@/lib/utils";

export const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
export const field =
  "w-full rounded-md border bg-background px-3 text-[13px] outline-none hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-bg-secondary";

export type Stage = "draft" | "upcoming" | "running" | "judging" | "results" | "cancelled";

const STAGE_LABELS: Record<Stage, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  running: "Running",
  judging: "Judging",
  results: "Results",
  cancelled: "Cancelled",
};

/** The stage as a small tag; running gets the brand mark. */
export function StageTag({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1.5 rounded-sm border px-1.5 font-mono text-[11px] tracking-[0.08em] uppercase",
        stage === "running" ? "border-brand/40 text-brand-text" : "text-muted-foreground",
      )}
    >
      {stage === "running" && <span aria-hidden className="size-1.5 rounded-full bg-brand" />}
      {STAGE_LABELS[stage]}
    </span>
  );
}

const dateTime = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

/**
 * A time in the viewer's own time zone. The server renders it in its own,
 * so the first paint may differ until the browser takes over.
 */
export function LocalTime({ at }: { at: number }) {
  return (
    <time dateTime={new Date(at).toISOString()} suppressHydrationWarning>
      {dateTime.format(at)}
    </time>
  );
}

/** A player's link, shown by domain (decisions §18, §19). */
export function OutLink({ href, label }: { href: string; label?: string }) {
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <a href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className="text-brand-text underline">
      {label ?? host}
    </a>
  );
}

export function teamSize(min: number, max: number) {
  if (max === 1) return "Solo";
  if (min === max) return `Teams of ${max}`;
  return `${min === 1 ? "Solo or teams" : `Teams of ${min}`} up to ${max}`;
}

/** 77.5 → "77.5", 78 → "78". */
export function score(value: number) {
  return value.toLocaleString("en", { maximumFractionDigits: 1 });
}
