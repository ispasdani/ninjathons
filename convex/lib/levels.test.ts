import { describe, expect, it } from "vitest";

import { levelForXp, levelProgress, titleForLevel, xpForLevel } from "./levels";

describe("levels", () => {
  it("starts at level 1 and follows 100 × n^1.5", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(283);
    expect(xpForLevel(5)).toBe(800);
    expect(xpForLevel(50)).toBe(34300);
  });

  it("levels up exactly at each threshold", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(282)).toBe(2);
    expect(levelForXp(283)).toBe(3);
    expect(levelForXp(34300)).toBe(50);
  });

  it("gets slower to level up", () => {
    for (let n = 2; n < 100; n++) {
      expect(xpForLevel(n + 1) - xpForLevel(n)).toBeGreaterThan(xpForLevel(n) - xpForLevel(n - 1));
    }
  });

  it("gives each band its title", () => {
    expect(titleForLevel(1)).toBe("Initiate");
    expect(titleForLevel(4)).toBe("Initiate");
    expect(titleForLevel(5)).toBe("Coder");
    expect(titleForLevel(19)).toBe("Builder");
    expect(titleForLevel(20)).toBe("Engineer");
    expect(titleForLevel(39)).toBe("Architect");
    expect(titleForLevel(40)).toBe("Sensei");
    expect(titleForLevel(50)).toBe("Legend");
    expect(titleForLevel(120)).toBe("Legend");
  });

  it("reports where the current level starts and the next begins", () => {
    expect(levelProgress(150)).toEqual({
      xp: 150,
      level: 2,
      title: "Initiate",
      levelXp: 100,
      nextLevelXp: 283,
    });
  });
});
