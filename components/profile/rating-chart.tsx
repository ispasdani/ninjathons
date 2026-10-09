"use client";

import { useRef, useState } from "react";

const W = 640;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 20, left: 44 };
// Tier cut-offs (design.md 2.5), drawn as the recessive grid.
const CUTS = [
  [1200, "Apprentice"],
  [1400, "Specialist"],
  [1600, "Expert"],
  [1900, "Master"],
  [2200, "Grandmaster"],
] as const;

function dateLabel(at: number) {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The 1v1 rating after each rated game: one line, tier cut-offs as the grid, a crosshair and readout on hover. */
export function RatingChart({ points }: { points: { at: number; rating: number }[] }) {
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;

  const values = points.map((p) => p.rating);
  const lo = Math.floor((Math.min(...values) - 40) / 50) * 50;
  const hi = Math.ceil((Math.max(...values) + 40) / 50) * 50;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (r: number) => PAD.top + (1 - (r - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join("");
  const grid = CUTS.filter(([r]) => r > lo && r < hi);
  const active = hover === null ? null : points[hover];

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const box = svg.current!.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  }

  const last = points[points.length - 1];
  return (
    <figure>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={`1v1 rating over the last ${points.length} rated games, from ${points[0].rating} to ${last.rating}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {grid.map(([r, tier]) => (
          <g key={r}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(r)} y2={y(r)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(r) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
              {r}
            </text>
            <title>{tier}</title>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--border)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--border-strong)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(active.rating)} r={4} fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />
          </g>
        )}
        {/* Bigger than the line, so the hover catches anywhere in the plot. */}
        <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="transparent" />
      </svg>
      <figcaption className="mt-2 font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {active ? (
          <>
            <span className="text-foreground">{active.rating}</span> · game {hover! + 1} · {dateLabel(active.at)}
          </>
        ) : (
          `Last ${points.length} rated games`
        )}
      </figcaption>
    </figure>
  );
}
