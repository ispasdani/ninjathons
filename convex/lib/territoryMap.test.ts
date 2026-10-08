import { describe, expect, it } from "vitest";

import {
  buildMap,
  checkTake,
  levelToTake,
  neighbours,
  placements,
  type RegionState,
  totalPoints,
  winningPoints,
} from "./territoryMap";

function empty(size: number): RegionState[] {
  return Array.from({ length: size }, () => ({}));
}

/** The map with each home base held by its slot's player ("p0", "p1", ...). */
function started(players: number) {
  const map = buildMap(players);
  const state = empty(map.length);
  for (const region of map) if (region.home !== undefined) state[region.index] = { owner: `p${region.home}` };
  return { map, state };
}

describe("territory map", () => {
  it("has 37 regions worth 65 points for 3 or 4 players", () => {
    for (const players of [3, 4]) {
      const map = buildMap(players);
      expect(map).toHaveLength(37);
      expect(totalPoints(map)).toBe(65);
      expect(winningPoints(map)).toBe(33);
    }
  });

  it("has 61 regions worth 107 points for 5 or 6 players", () => {
    for (const players of [5, 6]) {
      const map = buildMap(players);
      expect(map).toHaveLength(61);
      expect(totalPoints(map)).toBe(107);
      expect(winningPoints(map)).toBe(54);
    }
  });

  it("values rings from the edge in: easy, medium, hard, then the Core", () => {
    const map = buildMap(3);
    expect(map[0]).toMatchObject({ core: true, level: "hard", value: 5, ring: 0 });
    expect(map.filter((r) => r.ring === 1).every((r) => r.level === "hard" && r.value === 3)).toBe(true);
    expect(map.filter((r) => r.ring === 2).every((r) => r.level === "medium" && r.value === 2)).toBe(true);
    expect(map.filter((r) => r.ring === 3).every((r) => r.level === "easy" && r.value === 1)).toBe(true);
    const big = buildMap(6);
    expect(big.filter((r) => r.level === "medium")).toHaveLength(12 + 18);
  });

  it("puts one home base per player on a corner, never next to another", () => {
    for (const players of [3, 4, 5, 6]) {
      const map = buildMap(players);
      const homes = map.filter((r) => r.home !== undefined);
      expect(homes.map((r) => r.home).sort()).toEqual(Array.from({ length: players }, (_, i) => i));
      for (const home of homes) {
        expect(home.ring).toBe(players <= 4 ? 3 : 4);
        // A corner has three neighbours on the map.
        expect(neighbours(map, home.index)).toHaveLength(3);
        expect(neighbours(map, home.index).some((n) => n.home !== undefined)).toBe(false);
      }
    }
  });

  it("gives every inner region six neighbours", () => {
    const map = buildMap(3);
    for (const region of map.filter((r) => r.ring < 3)) expect(neighbours(map, region.index)).toHaveLength(6);
  });

  it("claims at the region's level and attacks one level harder, capped at hard", () => {
    const map = buildMap(3);
    const edge = map.find((r) => r.ring === 3)!;
    const middle = map.find((r) => r.ring === 2)!;
    expect(levelToTake(edge, false)).toBe("easy");
    expect(levelToTake(edge, true)).toBe("medium");
    expect(levelToTake(middle, true)).toBe("hard");
    expect(levelToTake(map[0], true)).toBe("hard");
  });

  it("only lets a player take regions next to theirs that aren't home bases, theirs or shielded", () => {
    const { map, state } = started(3);
    const home = map.find((r) => r.home === 0)!;
    const next = neighbours(map, home.index).find((n) => n.ring === 3)!;
    expect(checkTake(map, state, "p0", next.index, 0)).toEqual({ ok: true, level: "easy", attack: false });
    expect(checkTake(map, state, "p0", home.index, 0)).toEqual({ ok: false, reason: "ALREADY_YOURS" });
    const rivalHome = map.find((r) => r.home === 1)!;
    expect(checkTake(map, state, "p0", rivalHome.index, 0)).toEqual({ ok: false, reason: "HOME_BASE" });
    expect(checkTake(map, state, "p0", 0, 0)).toEqual({ ok: false, reason: "NOT_NEXT_TO_YOURS" });

    state[next.index] = { owner: "p1", shieldUntil: 60_000 };
    expect(checkTake(map, state, "p0", next.index, 59_999)).toEqual({ ok: false, reason: "SHIELDED" });
    expect(checkTake(map, state, "p0", next.index, 60_000)).toEqual({ ok: true, level: "medium", attack: true });
  });

  it("places by points, then regions, then who got there first, with leavers last", () => {
    const places = placements([
      { id: "a", points: 10, regions: 6, scoreAt: 50 },
      { id: "b", points: 12, regions: 5, scoreAt: 90 },
      { id: "c", points: 10, regions: 7, scoreAt: 70 },
      { id: "d", points: 30, regions: 20, scoreAt: 10, leftAt: 100 },
      { id: "e", points: 1, regions: 1, scoreAt: 0, leftAt: 200 },
    ]);
    expect(places).toEqual([
      { id: "b", place: 1 },
      { id: "c", place: 2 },
      { id: "a", place: 3 },
      { id: "e", place: 4 },
      { id: "d", place: 5 },
    ]);
  });

  it("shares a place only when equal on everything", () => {
    const places = placements([
      { id: "a", points: 5, regions: 3, scoreAt: 40 },
      { id: "b", points: 5, regions: 3, scoreAt: 40 },
      { id: "c", points: 5, regions: 3, scoreAt: 41 },
    ]);
    expect(places.map((p) => p.place)).toEqual([1, 1, 3]);
  });
});
