/**
 * The Territory map and its rules (decisions §16). Pure, so the rules are easy
 * to test; lib/territory.ts applies them to a game.
 */

export type Level = "easy" | "medium" | "hard";
export const LEVELS: Level[] = ["easy", "medium", "hard"];

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;
// New captures can't be attacked for this long.
export const SHIELD_MS = 60_000;

export type Region = {
  index: number;
  // Axial hex coordinates; the Core is (0, 0).
  q: number;
  r: number;
  // Steps from the Core; the edge is ring `radius`.
  ring: number;
  level: Level;
  value: number;
  core: boolean;
  // The player slot whose home base this is.
  home?: number;
};

// Neighbour offsets in axial coordinates, going round the hexagon.
const DIRECTIONS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

// Which of the six corners are home bases, spread evenly.
const HOME_CORNERS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

/** 37 regions (radius 3) for 3 or 4 players, 61 (radius 4) for 5 or 6. */
export function radiusFor(players: number) {
  if (players < MIN_PLAYERS || players > MAX_PLAYERS) throw new Error(`Territory needs 3 to 6 players, not ${players}`);
  return players <= 4 ? 3 : 4;
}

function ringLevel(ring: number, radius: number): { level: Level; value: number } {
  if (ring === 0) return { level: "hard", value: 5 };
  if (ring === radius) return { level: "easy", value: 1 };
  if (ring === 1) return { level: "hard", value: 3 };
  return { level: "medium", value: 2 };
}

/** Every region, the Core first, then ring by ring. */
export function buildMap(players: number): Region[] {
  const radius = radiusFor(players);
  const corners = HOME_CORNERS[players].map((c) => DIRECTIONS[c].map((d) => d * radius).join(","));
  const regions: Region[] = [];
  for (let ring = 0; ring <= radius; ring++) {
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) !== ring) continue;
        const slot = corners.indexOf(`${q},${r}`);
        regions.push({
          index: regions.length,
          q,
          r,
          ring,
          ...ringLevel(ring, radius),
          core: ring === 0,
          ...(slot >= 0 ? { home: slot } : {}),
        });
      }
    }
  }
  return regions;
}

export function totalPoints(map: Region[]) {
  return map.reduce((sum, region) => sum + region.value, 0);
}

/** Points that win at once: more than half. */
export function winningPoints(map: Region[]) {
  return Math.floor(totalPoints(map) / 2) + 1;
}

export function neighbours(map: Region[], index: number) {
  const { q, r } = map[index];
  return map.filter((other) => DIRECTIONS.some(([dq, dr]) => other.q === q + dq && other.r === r + dr));
}

/** The level a problem must be to take a region: its own when empty, one harder from a rival. */
export function levelToTake(region: Region, held: boolean) {
  if (!held) return region.level;
  return LEVELS[Math.min(LEVELS.indexOf(region.level) + 1, LEVELS.length - 1)];
}

export function atLeast(level: Level, needed: Level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(needed);
}

/** A region's owner and shield, as the game has them now. */
export type RegionState = { owner?: string; shieldUntil?: number };

export type TakeCheck =
  | { ok: true; level: Level; attack: boolean }
  | { ok: false; reason: "HOME_BASE" | "ALREADY_YOURS" | "NOT_NEXT_TO_YOURS" | "SHIELDED" };

/** Whether `player` may take region `index` now, and the level that takes. */
export function checkTake(map: Region[], state: RegionState[], player: string, index: number, now: number): TakeCheck {
  const region = map[index];
  const { owner, shieldUntil } = state[index];
  if (owner === player) return { ok: false, reason: "ALREADY_YOURS" };
  if (region.home !== undefined) return { ok: false, reason: "HOME_BASE" };
  if (!neighbours(map, index).some((n) => state[n.index].owner === player)) {
    return { ok: false, reason: "NOT_NEXT_TO_YOURS" };
  }
  if (owner !== undefined && shieldUntil !== undefined && shieldUntil > now) return { ok: false, reason: "SHIELDED" };
  return { ok: true, level: levelToTake(region, owner !== undefined), attack: owner !== undefined };
}

export type Standing<T> = {
  id: T;
  points: number;
  regions: number;
  // When their points last changed.
  scoreAt: number;
  // When they left, if they did.
  leftAt?: number;
};

/**
 * Places from 1: points, then regions held, then who reached their score
 * first; equal on all three share a place. Players who left come last, later
 * leavers above earlier ones.
 */
export function placements<T>(players: Standing<T>[]): { id: T; place: number }[] {
  const key = (p: Standing<T>) =>
    p.leftAt === undefined ? [0, -p.points, -p.regions, p.scoreAt] : [1, -p.leftAt, 0, 0];
  const sorted = [...players].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
  const places: { id: T; place: number }[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    const tied = prev && key(prev).every((k, j) => k === key(p)[j]);
    places.push({ id: p.id, place: tied ? places[i - 1].place : i + 1 });
  });
  return places;
}
