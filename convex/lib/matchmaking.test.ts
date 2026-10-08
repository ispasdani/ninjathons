import { describe, expect, it } from "vitest";

import { ANY_OPPONENT_AFTER_MS, GROUP_WAIT_MS, groupPlayers, pairPlayers, ratingRange } from "./matchmaking";

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

describe("groupPlayers", () => {
  const at = (id: string, rating: number, joinedAt = 0) => ({ id, rating, joinedAt });

  it("forms a game at once when 6 players are in range", () => {
    const queue = ["a", "b", "c", "d", "e", "f", "g"].map((id, i) => at(id, 1500 + i * 10, i));
    // g is the furthest from a: left for the next game.
    expect(groupPlayers(queue, 10)).toEqual([["a", "b", "c", "d", "e", "f"]]);
  });

  it("waits 30 s before starting with 3 to 5 players", () => {
    const queue = [at("a", 1500, 0), at("b", 1520, 1_000), at("c", 1540, 2_000)];
    expect(groupPlayers(queue, GROUP_WAIT_MS - 1)).toEqual([]);
    expect(groupPlayers(queue, GROUP_WAIT_MS)).toEqual([["a", "b", "c"]]);
  });

  it("never starts with 2", () => {
    expect(groupPlayers([at("a", 1500), at("b", 1500)], 10 * 60_000)).toEqual([]);
  });

  it("only gathers players in range of everyone already gathered", () => {
    // After 10 s everyone accepts ±200: c is in range of b but not of a.
    const queue = [at("a", 1300), at("b", 1450), at("c", 1600), at("d", 1350)];
    expect(groupPlayers(queue, 10_000)).toEqual([]);
    expect(groupPlayers(queue, GROUP_WAIT_MS - 10_000)).toEqual([]);
    // At 30 s the range is ±400, wide enough for everyone.
    expect(groupPlayers(queue, GROUP_WAIT_MS)).toEqual([["a", "d", "b", "c"]]);
  });
});
