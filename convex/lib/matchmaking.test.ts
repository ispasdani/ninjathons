import { describe, expect, it } from "vitest";

import { ANY_OPPONENT_AFTER_MS, pairPlayers, ratingRange } from "./matchmaking";

describe("ratingRange", () => {
  it("starts at ±100, widens by 50 every 5 s and opens up after a minute", () => {
    expect(ratingRange(0, 0)).toBe(100);
    expect(ratingRange(0, 4_999)).toBe(100);
    expect(ratingRange(0, 5_000)).toBe(150);
    expect(ratingRange(0, 30_000)).toBe(400);
    expect(ratingRange(0, ANY_OPPONENT_AFTER_MS)).toBe(Infinity);
  });
});

describe("pairPlayers", () => {
  it("pairs players within range, closest rating first", () => {
    const pairs = pairPlayers(
      [
        { id: "a", rating: 1500, joinedAt: 0 },
        { id: "b", rating: 1580, joinedAt: 1 },
        { id: "c", rating: 1510, joinedAt: 2 },
      ],
      10,
    );
    expect(pairs).toEqual([["a", "c"]]);
  });

  it("leaves players too far apart until the longer wait widens the range", () => {
    const queue = [
      { id: "a", rating: 1200, joinedAt: 0 },
      { id: "b", rating: 1500, joinedAt: 15_000 },
    ];
    expect(pairPlayers(queue, 19_999)).toEqual([]);
    // a has waited 20 s: ±300 covers the gap.
    expect(pairPlayers(queue, 20_000)).toEqual([["a", "b"]]);
  });

  it("serves the longest-waiting player first", () => {
    const pairs = pairPlayers(
      [
        { id: "new", rating: 1500, joinedAt: 50 },
        { id: "old", rating: 1520, joinedAt: 0 },
        { id: "mid", rating: 1505, joinedAt: 10 },
      ],
      60,
    );
    expect(pairs).toEqual([["old", "mid"]]);
  });
});
