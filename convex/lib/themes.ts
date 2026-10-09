/**
 * Profile themes and the Pro options (decisions §18). A theme is an id and
 * these values, never user CSS; every theme passes the contrast check in
 * both modes (lib/themes.test.ts). Shared by Convex and the pages.
 */

export type ThemeColors = {
  bg: string;
  // Cards and chips on the profile.
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
};

export type Theme = {
  id: string;
  // Placeholder names, like the titles.
  name: string;
  kind: "free" | "earned" | "pro";
  // For earned themes: the badge that unlocks it, kept once earned.
  badge?: string;
  unlock?: string;
  light: ThemeColors;
  dark: ThemeColors;
};

export const THEMES: Theme[] = [
  {
    id: "default",
    name: "Default",
    kind: "free",
    light: { bg: "#ffffff", surface: "#f5f5f5", text: "#0a0a0a", muted: "#666666", accent: "#5e720d", border: "#e5e5e5" },
    dark: { bg: "#0a0a0a", surface: "#171717", text: "#fafafa", muted: "#a1a1a1", accent: "#c4f012", border: "#262626" },
  },
  {
    id: "slate",
    name: "Slate",
    kind: "free",
    light: { bg: "#f8fafc", surface: "#eef2f7", text: "#0f172a", muted: "#475569", accent: "#334155", border: "#e2e8f0" },
    dark: { bg: "#0f172a", surface: "#1e293b", text: "#f1f5f9", muted: "#a5b4c8", accent: "#cbd5e1", border: "#334155" },
  },
  {
    id: "ink",
    name: "Ink",
    kind: "free",
    light: { bg: "#fbfaf7", surface: "#f3f1ea", text: "#1c1917", muted: "#57534e", accent: "#1d4ed8", border: "#e7e5e4" },
    dark: { bg: "#12100e", surface: "#1c1917", text: "#f5f5f4", muted: "#a8a29e", accent: "#93c5fd", border: "#292524" },
  },
  {
    id: "circuit",
    name: "Circuit",
    kind: "earned",
    badge: "title-engineer",
    unlock: "Reach level 20",
    light: { bg: "#f6fbf7", surface: "#e9f5ec", text: "#052e16", muted: "#3f6650", accent: "#15803d", border: "#cfe8d6" },
    dark: { bg: "#04140b", surface: "#0a2416", text: "#dcfce7", muted: "#8dbba1", accent: "#4ade80", border: "#14532d" },
  },
  {
    id: "dojo",
    name: "Dojo",
    kind: "earned",
    badge: "title-sensei",
    unlock: "Reach level 40",
    light: { bg: "#fdf8f3", surface: "#f7ece0", text: "#2b1a10", muted: "#6b4f3a", accent: "#b45309", border: "#ecd9c6" },
    dark: { bg: "#170f0a", surface: "#24170f", text: "#fbeee2", muted: "#c4a68d", accent: "#f59e0b", border: "#3d2a1d" },
  },
  {
    id: "tide",
    name: "Tide",
    kind: "earned",
    badge: "tier-expert",
    unlock: "Reach Expert in 1v1",
    light: { bg: "#f5f9ff", surface: "#e8f1fe", text: "#0b1b33", muted: "#3d5a80", accent: "#2563eb", border: "#d3e3fb" },
    dark: { bg: "#07111f", surface: "#0d1d33", text: "#e0edff", muted: "#8fb0d9", accent: "#60a5fa", border: "#1c3557" },
  },
  {
    id: "royal",
    name: "Royal",
    kind: "earned",
    badge: "tier-master",
    unlock: "Reach Master in 1v1",
    light: { bg: "#faf7ff", surface: "#f1eafe", text: "#1e1033", muted: "#5b4a7a", accent: "#7c3aed", border: "#e2d6f9" },
    dark: { bg: "#110a1d", surface: "#1d1230", text: "#f1e9ff", muted: "#b3a0d6", accent: "#a78bfa", border: "#33224f" },
  },
  {
    id: "terminal",
    name: "Terminal",
    kind: "pro",
    light: { bg: "#f4f7f2", surface: "#e8eee4", text: "#10200f", muted: "#4a5e47", accent: "#2f7d32", border: "#d3dece" },
    dark: { bg: "#050805", surface: "#0c140c", text: "#c8f7c5", muted: "#7fb07b", accent: "#39ff14", border: "#1a2e1a" },
  },
  {
    id: "editorial",
    name: "Editorial",
    kind: "pro",
    light: { bg: "#fffdf8", surface: "#f6f1e7", text: "#1a1a1a", muted: "#5f5a52", accent: "#b91c1c", border: "#e8e1d3" },
    dark: { bg: "#141312", surface: "#1f1d1b", text: "#f2efe9", muted: "#aaa49a", accent: "#f87171", border: "#34312d" },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    kind: "pro",
    light: { bg: "#f2f7fc", surface: "#e3eef9", text: "#0b2545", muted: "#3c5a7d", accent: "#1d63b8", border: "#c9dcf0" },
    dark: { bg: "#0b2545", surface: "#13315c", text: "#e8f1fb", muted: "#a7c0dd", accent: "#8ecbff", border: "#23466f" },
  },
];

export const DEFAULT_THEME = "default";

export function themeById(id: string | undefined) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Pro options. Banners are built-in patterns tinted with the accent; no uploads in V1.
export const BANNERS = ["none", "dots", "grid", "diagonal", "waves", "hex"] as const;
export type Banner = (typeof BANNERS)[number];

// Heading fonts from an approved list; the page loads them only when used.
export const FONTS = [
  { id: "geist", name: "Geist" },
  { id: "space-grotesk", name: "Space Grotesk" },
  { id: "fraunces", name: "Fraunces" },
  { id: "jetbrains-mono", name: "JetBrains Mono" },
  { id: "instrument-serif", name: "Instrument Serif" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

// The sections a player can move or hide. The header and stats block are fixed.
export const SECTIONS = ["about", "pinned", "activity", "rating", "badges", "recent"] as const;
export type Section = (typeof SECTIONS)[number];

export const MIN_TEXT_CONTRAST = 4.5;
export const MIN_ACCENT_CONTRAST = 3;

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** Whether a custom accent reads against the theme's background in both modes. */
export function accentFits(theme: Theme, accent: string) {
  return (
    isHexColor(accent) &&
    contrast(accent, theme.light.bg) >= MIN_ACCENT_CONTRAST &&
    contrast(accent, theme.dark.bg) >= MIN_ACCENT_CONTRAST
  );
}
