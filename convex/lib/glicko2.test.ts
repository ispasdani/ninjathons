import { describe, expect, it } from "vitest";

import { DEFAULT_GLICKO, rate } from "./glicko2";

describe("Glicko-2", () => {
  it("matches the worked example in Glickman's paper", () => {
    const next = rate({ rating: 1500, rd: 200, volatility: 0.06 }, [
      { opponent: { rating: 1400, rd: 30 }, score: 1 },
      { opponent: { rating: 1550, rd: 100 }, score: 0 },
      { opponent: { rating: 1700, rd: 300 }, score: 0 },
    ]);
    expect(next.rating).toBeCloseTo(1464.06, 1);
    expect(next.rd).toBeCloseTo(151.52, 1);
    // The paper prints 0.05999, truncated.
    expect(next.volatility).toBeCloseTo(0.06, 4);
  });

  it("moves two new players apart by the same amount", () => {
    const winner = rate(DEFAULT_GLICKO, [{ opponent: DEFAULT_GLICKO, score: 1 }]);
    const loser = rate(DEFAULT_GLICKO, [{ opponent: DEFAULT_GLICKO, score: 0 }]);
    expect(winner.rating).toBeGreaterThan(1500);
    expect(winner.rating - 1500).toBeCloseTo(1500 - loser.rating, 6);
    expect(winner.rd).toBeLessThan(350);
  });

  it("leaves a draw between equals where it was", () => {
    const next = rate(DEFAULT_GLICKO, [{ opponent: DEFAULT_GLICKO, score: 0.5 }]);
    expect(next.rating).toBeCloseTo(1500, 6);
  });

  it("gains less for beating a much weaker player than a stronger one", () => {
    const player = { rating: 1500, rd: 80, volatility: 0.06 };
    const weak = rate(player, [{ opponent: { rating: 1100, rd: 80 }, score: 1 }]);
    const strong = rate(player, [{ opponent: { rating: 1900, rd: 80 }, score: 1 }]);
    expect(weak.rating - 1500).toBeLessThan(strong.rating - 1500);
  });

  it("only grows the deviation without games, up to the starting value", () => {
    const next = rate({ rating: 1600, rd: 100, volatility: 0.06 }, []);
    expect(next.rating).toBe(1600);
    expect(next.rd).toBeGreaterThan(100);
    expect(rate(DEFAULT_GLICKO, []).rd).toBe(350);
  });
});
