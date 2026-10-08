/**
 * Pairing for Find a match (decisions §14). Pure, so the rules are easy to
 * test; queue.ts runs it in the scheduled pass.
 */

// The rating range starts at ±100 and widens by 50 every 5 seconds of waiting;
// after a minute anyone is a fair opponent.
export const BASE_RANGE = 100;
export const RANGE_STEP = 50;
export const RANGE_STEP_MS = 5_000;
export const ANY_OPPONENT_AFTER_MS = 60_000;

/** How far from their rating a player who joined at `joinedAt` accepts an opponent. */
export function ratingRange(joinedAt: number, now: number) {
  const waited = now - joinedAt;
  if (waited >= ANY_OPPONENT_AFTER_MS) return Infinity;
  return BASE_RANGE + RANGE_STEP * Math.floor(waited / RANGE_STEP_MS);
}

type Waiting<T> = { id: T; rating: number; joinedAt: number };

/**
 * Pairs the queue, longest waiting first: each player gets the closest-rated
 * opponent within the wider of the two players' ranges.
 */
export function pairPlayers<T>(queue: Waiting<T>[], now: number): [T, T][] {
  const waiting = [...queue].sort((a, b) => a.joinedAt - b.joinedAt);
  const taken = new Set<T>();
  const pairs: [T, T][] = [];
  for (const player of waiting) {
    if (taken.has(player.id)) continue;
    let best: Waiting<T> | undefined;
    for (const other of waiting) {
      if (other.id === player.id || taken.has(other.id)) continue;
      const gap = Math.abs(other.rating - player.rating);
      const range = Math.max(ratingRange(player.joinedAt, now), ratingRange(other.joinedAt, now));
      if (gap > range) continue;
      if (!best || gap < Math.abs(best.rating - player.rating)) best = other;
    }
    if (best) {
      taken.add(player.id);
      taken.add(best.id);
      pairs.push([player.id, best.id]);
    }
  }
  return pairs;
}

// Territory (decisions §16): a game forms at once with 6 players in range of
// each other, or with 3 or more once the longest-waiting has waited 30 s.
export const GROUP_MIN = 3;
export const GROUP_MAX = 6;
export const GROUP_WAIT_MS = 30_000;

/**
 * Groups the Territory queue, longest waiting first: each player gathers the
 * closest-rated others who are in range of everyone gathered so far (the
 * wider of each two players' ranges), up to 6.
 */
export function groupPlayers<T>(queue: Waiting<T>[], now: number): T[][] {
  const waiting = [...queue].sort((a, b) => a.joinedAt - b.joinedAt);
  const inRange = (a: Waiting<T>, b: Waiting<T>) =>
    Math.abs(a.rating - b.rating) <= Math.max(ratingRange(a.joinedAt, now), ratingRange(b.joinedAt, now));
  const taken = new Set<T>();
  const groups: T[][] = [];
  for (const anchor of waiting) {
    if (taken.has(anchor.id)) continue;
    const others = waiting
      .filter((p) => p.id !== anchor.id && !taken.has(p.id))
      .sort((a, b) => Math.abs(a.rating - anchor.rating) - Math.abs(b.rating - anchor.rating));
    const group = [anchor];
    for (const other of others) {
      if (group.length === GROUP_MAX) break;
      if (group.every((p) => inRange(p, other))) group.push(other);
    }
    const full = group.length === GROUP_MAX;
    const waitedEnough = group.length >= GROUP_MIN && now - anchor.joinedAt >= GROUP_WAIT_MS;
    if (!full && !waitedEnough) continue;
    for (const p of group) taken.add(p.id);
    groups.push(group.map((p) => p.id));
  }
  return groups;
}
