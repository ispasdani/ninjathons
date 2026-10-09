"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

// One hue, light to dark (sequential): the empty cell, then --brand-text mixed
// in at four steps. --brand-text is olive in light mode and neon in dark, so
// the ramp is picked per mode from the brand's own tokens.
const STEPS = [
  "var(--bg-tertiary)",
  "color-mix(in oklab, var(--brand-text) 35%, var(--bg-tertiary))",
  "color-mix(in oklab, var(--brand-text) 60%, var(--bg-tertiary))",
  "color-mix(in oklab, var(--brand-text) 80%, var(--bg-tertiary))",
  "var(--brand-text)",
];

function step(count: number) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function dayLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function countLabel(count: number) {
  return count === 0 ? "No activity" : `${count} ${count === 1 ? "solve or lesson" : "solves and lessons"}`;
}

/**
 * 26 weeks of accepted Submits and finished lessons (decisions §18), a column
 * per week from Monday, by UTC day. Hovering or focusing a day reads it out.
 */
export function ActivityGrid({ activity }: { activity: { from: string; today: string; days: Record<string, number> } }) {
  const [focus, setFocus] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // On narrow screens the grid scrolls; start at this week, not 26 weeks ago.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);
  const start = Date.parse(`${activity.from}T00:00:00Z`);
  const end = Date.parse(`${activity.today}T00:00:00Z`);
  const weeks: { day: string; count: number; future: boolean }[][] = [];
  for (let t = start, i = 0; i < 26 * 7; i++, t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ day, count: activity.days[day] ?? 0, future: t > end });
  }
  const total = Object.values(activity.days).reduce((a, b) => a + b, 0);
  const shown = focus ?? null;

  return (
    <div>
      <div ref={scroller} className="flex gap-1.5 overflow-x-auto pb-1">
        <div className="sticky left-0 z-10 grid shrink-0 grid-rows-7 gap-[3px] bg-background pr-1 font-mono text-[10px] leading-[11px] text-muted-foreground" aria-hidden>
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="h-[11px]">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="grid" aria-label={`Activity, last 26 weeks: ${total} in all`}>
          {weeks.flat().map(({ day, count, future }) => (
            <span
              key={day}
              role="gridcell"
              tabIndex={future ? -1 : 0}
              aria-label={future ? undefined : `${dayLabel(day)}: ${countLabel(count)}`}
              aria-hidden={future || undefined}
              onMouseEnter={() => !future && setFocus(day)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(day)}
              onBlur={() => setFocus(null)}
              className={cn(
                "size-[11px] rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                future && "invisible",
                shown === day && "ring-1 ring-foreground",
              )}
              style={{ background: STEPS[step(count)] }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-muted-foreground tabular-nums">
        <span aria-live="polite">
          {shown ? `${dayLabel(shown)} · ${countLabel(activity.days[shown] ?? 0)}` : `${total} in the last 26 weeks`}
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          Less
          {STEPS.map((color) => (
            <span key={color} className="size-[11px] rounded-[2px]" style={{ background: color }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
