import { describe, expect, it } from "vitest";

import { dailyXp, difficultyForDay, NO_STREAK, settle, solveDay, type StreakState } from "./daily";

/** Solves each day in turn from no streak. */
function solveAll(days: string[], from: StreakState = NO_STREAK) {
  return days.reduce(solveDay, from);
}

describe("daily rules", () => {
  it("picks the difficulty by weekday", () => {
    expect(difficultyForDay("2026-10-05")).toBe("easy"); // Monday
    expect(difficultyForDay("2026-10-06")).toBe("easy");
    expect(difficultyForDay("2026-10-07")).toBe("medium");
    expect(difficultyForDay("2026-10-09")).toBe("medium"); // Friday
    expect(difficultyForDay("2026-10-10")).toBe("hard");
    expect(difficultyForDay("2026-10-11")).toBe("hard"); // Sunday
  });

  it("gives 30 XP plus 5 per streak day after the first, at most +50", () => {
    expect(dailyXp(1)).toBe(30);
    expect(dailyXp(2)).toBe(35);
    expect(dailyXp(11)).toBe(80);
    expect(dailyXp(40)).toBe(80);
  });

  it("counts days in a row, and starts again after a gap", () => {
    const three = solveAll(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(three).toMatchObject({ current: 3, best: 3, totalSolved: 3, coveredThrough: "2026-10-03" });
    const after = solveDay(three, "2026-10-06");
    expect(after).toMatchObject({ current: 1, best: 3, totalSolved: 4 });
  });

  it("solving the same day twice changes nothing", () => {
    const one = solveAll(["2026-10-01"]);
    expect(solveDay(one, "2026-10-01")).toEqual(one);
  });

  it("earns a freeze every 7 days, at most 2", () => {
    const days = Array.from({ length: 21 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    expect(solveAll(days.slice(0, 6)).freezes).toBe(0);
    expect(solveAll(days.slice(0, 7)).freezes).toBe(1);
    expect(solveAll(days.slice(0, 14)).freezes).toBe(2);
    expect(solveAll(days).freezes).toBe(2);
  });

  it("uses a freeze for a missed day, keeping the streak without adding to it", () => {
    const week = solveAll(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]);
    // Missed the 8th; solved the 9th.
    const next = solveDay(week, "2026-10-09");
    expect(next).toMatchObject({ current: 8, freezes: 0, totalSolved: 8 });
  });

  it("settles a missed day: a freeze covers it, else the streak goes to 0", () => {
    const withFreeze = { ...NO_STREAK, current: 9, best: 9, freezes: 1, coveredThrough: "2026-10-07" };
    expect(settle(withFreeze, "2026-10-08")).toMatchObject({ current: 9, freezes: 0, coveredThrough: "2026-10-08" });
    expect(settle(withFreeze, "2026-10-09")).toMatchObject({ current: 0, best: 9, coveredThrough: undefined });
    // Nothing to settle when already covered.
    expect(settle(withFreeze, "2026-10-07")).toEqual(withFreeze);
  });
});
