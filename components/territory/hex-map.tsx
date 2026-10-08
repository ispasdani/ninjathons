"use client";

import { Home, Lock } from "lucide-react";

import type { Level } from "@/convex/lib/territoryMap";
import { cn } from "@/lib/utils";

export type MapRegion = {
  index: number;
  q: number;
  r: number;
  level: Level;
  value: number;
  core: boolean;
  home?: number;
  ownerId?: string;
  shieldUntil?: number;
};

export type MapPlayer = { userId: string; initial: string; color: PlayerColor };

// Player colours (design.md 2.4): you are always blue; the others follow their home base order.
export const PLAYER_COLORS = ["you", "opponent", "p3", "p4", "p5", "p6"] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const STROKE: Record<PlayerColor, string> = {
  you: "stroke-duel-you",
  opponent: "stroke-duel-opponent",
  p3: "stroke-duel-p3",
  p4: "stroke-duel-p4",
  p5: "stroke-duel-p5",
  p6: "stroke-duel-p6",
};
const FILL: Record<PlayerColor, string> = {
  you: "fill-duel-you/20",
  opponent: "fill-duel-opponent/20",
  p3: "fill-duel-p3/20",
  p4: "fill-duel-p4/20",
  p5: "fill-duel-p5/20",
  p6: "fill-duel-p6/20",
};
export const DOT: Record<PlayerColor, string> = {
  you: "bg-duel-you",
  opponent: "bg-duel-opponent",
  p3: "bg-duel-p3",
  p4: "bg-duel-p4",
  p5: "bg-duel-p5",
  p6: "bg-duel-p6",
};

const SIZE = 30;
const SQRT3 = Math.sqrt(3);

function centre(q: number, r: number) {
  return { x: SIZE * SQRT3 * (q + r / 2), y: SIZE * 1.5 * r };
}

function corners(x: number, y: number, size: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${(x + size * Math.cos(angle)).toFixed(2)},${(y + size * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

const LEVEL_NAMES: Record<Level, string> = { easy: "easy", medium: "medium", hard: "hard" };

export function regionName(region: Pick<MapRegion, "core" | "home" | "level" | "value">) {
  if (region.core) return "the Core";
  if (region.home !== undefined) return "a home base";
  return `a ${LEVEL_NAMES[region.level]} region (+${region.value})`;
}

/**
 * The Territory map: pointy-top hexes, held regions in their player's colour
 * with the player's initial, regions you can take outlined, the selected one
 * thicker. Each region is a button for keyboard and screen reader users.
 */
export function HexMap({
  regions,
  players,
  takeable,
  selected,
  now,
  onSelect,
}: {
  regions: MapRegion[];
  players: MapPlayer[];
  takeable: Set<number>;
  selected: number | null;
  now: number;
  onSelect: (index: number) => void;
}) {
  const byId = new Map(players.map((p) => [p.userId, p]));
  const radius = Math.max(...regions.map((r) => Math.max(Math.abs(r.q), Math.abs(r.r), Math.abs(r.q + r.r))));
  const halfWidth = SIZE * SQRT3 * (radius + 0.5) + 2;
  const halfHeight = SIZE * (1.5 * radius + 1) + 2;

  return (
    <svg
      viewBox={`${-halfWidth} ${-halfHeight} ${halfWidth * 2} ${halfHeight * 2}`}
      className="h-full max-h-full w-full"
      role="group"
      aria-label="Territory map"
    >
      {regions.map((region) => {
        const { x, y } = centre(region.q, region.r);
        const owner = region.ownerId ? byId.get(region.ownerId) : undefined;
        const shielded = owner && region.shieldUntil !== undefined && region.shieldUntil > now;
        const canTake = takeable.has(region.index);
        const isSelected = selected === region.index;
        const label = `${regionName(region)}, ${owner ? `held by ${owner.initial}` : "empty"}${shielded ? ", shielded" : ""}${canTake ? ", you can take it" : ""}`;
        return (
          <g
            key={region.index}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => onSelect(region.index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(region.index);
              }
            }}
            className="cursor-pointer outline-none focus-visible:[&>polygon:first-child]:stroke-foreground"
          >
            <polygon
              points={corners(x, y, SIZE - 1.5)}
              className={cn(
                "transition-[fill,stroke] duration-300 ease-out-quad",
                owner ? [FILL[owner.color], STROKE[owner.color]] : "fill-background stroke-border-strong",
                canTake && !owner && "fill-bg-secondary",
                isSelected ? "stroke-foreground" : "",
              )}
              strokeWidth={isSelected ? 3 : owner ? 2 : 1}
              strokeDasharray={canTake && !isSelected ? "4 3" : undefined}
            />
            {region.home !== undefined ? (
              <Home x={x - 7} y={y - 12} width={14} height={14} className="text-muted-foreground" aria-hidden />
            ) : (
              <text
                x={x}
                y={owner ? y - 3 : y + 4}
                textAnchor="middle"
                className={cn("fill-muted-foreground font-mono text-[11px]", region.core && "fill-foreground font-medium")}
              >
                {region.core ? "+5" : `+${region.value}`}
              </text>
            )}
            {owner && (
              <text x={x} y={y + 12} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
                {owner.initial}
              </text>
            )}
            {shielded && <Lock x={x + 8} y={y - 18} width={10} height={10} className="text-muted-foreground" aria-hidden />}
          </g>
        );
      })}
    </svg>
  );
}
