import { describe, expect, it } from "vitest";

import { DEFAULT_OPENSKILL, rateGame, type Skill } from "./openskill";

// Expected [mu, sigma] from the openskill package (5.0.1), whose `rate` was
// called with the defaults multiplied by 60 ({ mu: 1500, sigma: 500,
// beta: 250, tau: 5 }) and the same ranks.
const MIXED = [
  { mu: 1720, sigma: 180 },
  { mu: 1400, sigma: 420 },
  { mu: 1555, sigma: 95 },
  { mu: 1300, sigma: 300 },
  { mu: 1610, sigma: 250 },
  { mu: 1500, sigma: 500 },
];
const CASES: [Skill[], number[], [number, number][]][] = [
  [
    Array.from({ length: 4 }, () => ({ ...DEFAULT_OPENSKILL })),
    [1, 2, 3, 4],
    [
      [1667.71516, 495.814307],
      [1593.175089, 490.777079],
      [1481.364982, 485.047673],
      [1257.744768, 485.047673],
    ],
  ],
  [
    MIXED,
    [3, 1, 2, 6, 4, 5],
    [
      [1728.479387, 179.776837],
      [1550.785456, 418.057442],
      [1560.680559, 95.118975],
      [1190.457961, 296.539891],
      [1607.344735, 248.573811],
      [1378.837273, 469.35046],
    ],
  ],
  [
    MIXED,
    [1, 1, 3, 3, 5, 6],
    [
      [1729.653746, 179.983794],
      [1462.372696, 418.057442],
      [1555.573807, 95.117589],
      [1314.595432, 298.903414],
      [1610.687756, 248.867468],
      [1278.029749, 481.645895],
    ],
  ],
  [
    MIXED,
    [2, 2, 2, 1, 5, 5],
    [
      [1716.628046, 179.888814],
      [1402.859479, 415.831231],
      [1554.663175, 95.119056],
      [1378.209028, 299.570176],
      [1583.742732, 248.938159],
      [1419.042696, 482.795386],
    ],
  ],
];

describe("openskill", () => {
  it("matches the openskill package, ties included", () => {
    for (const [players, ranks, expected] of CASES) {
      const rated = rateGame(players, ranks);
      rated.forEach((p, i) => {
        expect(p.mu).toBeCloseTo(expected[i][0], 5);
        expect(p.sigma).toBeCloseTo(expected[i][1], 5);
      });
    }
  });

  it("moves winners up and losers down, and narrows uncertainty", () => {
    const players = Array.from({ length: 3 }, () => ({ ...DEFAULT_OPENSKILL }));
    const [first, second, third] = rateGame(players, [1, 2, 3]);
    expect(first.mu).toBeGreaterThan(1500);
    expect(third.mu).toBeLessThan(1500);
    expect(second.mu).toBeGreaterThan(third.mu);
    for (const p of [first, second, third]) expect(p.sigma).toBeLessThan(500);
  });
});
