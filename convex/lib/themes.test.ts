import { describe, expect, it } from "vitest";

import { BADGES } from "./badges";
import { accentFits, contrast, MIN_ACCENT_CONTRAST, MIN_TEXT_CONTRAST, THEMES, themeById } from "./themes";

describe("themes", () => {
  it("has 3 free, 4 earned and 3 Pro themes with unique ids", () => {
    expect(THEMES.filter((t) => t.kind === "free")).toHaveLength(3);
    expect(THEMES.filter((t) => t.kind === "earned")).toHaveLength(4);
    expect(THEMES.filter((t) => t.kind === "pro")).toHaveLength(3);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("unlocks each earned theme with a badge that exists", () => {
    const ids = new Set(BADGES.map((b) => b.id));
    for (const theme of THEMES.filter((t) => t.kind === "earned")) expect(ids.has(theme.badge!)).toBe(true);
  });

  for (const theme of THEMES) {
    for (const mode of ["light", "dark"] as const) {
      it(`${theme.id} (${mode}) passes the contrast check`, () => {
        const c = theme[mode];
        expect(contrast(c.text, c.bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        expect(contrast(c.text, c.surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        expect(contrast(c.muted, c.bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        expect(contrast(c.muted, c.surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        expect(contrast(c.accent, c.bg)).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
      });
    }
  }

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("refuses an accent that fails either mode, or isn't a colour", () => {
    const def = themeById("default");
    expect(accentFits(def, "#1e3a8a")).toBe(false); // too dark on the dark background
    expect(accentFits(def, "#ffff00")).toBe(false); // too light on white
    expect(accentFits(def, "#e11d48")).toBe(true);
    expect(accentFits(def, "red")).toBe(false);
    expect(accentFits(def, "#e11d48; color: red")).toBe(false);
  });
});
