import { Fraunces, Instrument_Serif, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { themeById, type ThemeColors } from "@/convex/lib/themes";

// The approved heading fonts (decisions §18), loaded only when a profile uses one.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-profile-space-grotesk", preload: false });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-profile-fraunces", preload: false });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-profile-jetbrains-mono", preload: false });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-profile-instrument-serif",
  preload: false,
});

const FONT_FAMILY: Record<string, string | undefined> = {
  geist: undefined,
  "space-grotesk": "var(--font-profile-space-grotesk)",
  fraunces: "var(--font-profile-fraunces)",
  "jetbrains-mono": "var(--font-profile-jetbrains-mono)",
  "instrument-serif": "var(--font-profile-instrument-serif)",
};

export const fontVariables = [spaceGrotesk, fraunces, jetbrainsMono, instrumentSerif].map((f) => f.variable).join(" ");

export function headingFamily(font: string) {
  return FONT_FAMILY[font];
}

export type LookValues = {
  theme: string;
  accent: string | null;
  banner: string;
  headingFont: string;
  sections: { order: string[]; hidden: string[] };
};

function vars(c: ThemeColors, accent: string | null) {
  return [
    `--p-bg:${c.bg}`,
    `--p-surface:${c.surface}`,
    `--p-text:${c.text}`,
    `--p-muted:${c.muted}`,
    `--p-accent:${accent ?? c.accent}`,
    `--p-border:${c.border}`,
  ].join(";");
}

/**
 * The theme's values as CSS variables (--p-*) on one element, light and dark.
 * Built from the theme table and a checked hex accent only, never from user
 * text, so nothing a player types reaches the stylesheet.
 */
export function LookStyle({ scope, look }: { scope: string; look: LookValues }) {
  const theme = themeById(look.theme);
  const accent = look.accent && /^#[0-9a-f]{6}$/i.test(look.accent) ? look.accent : null;
  const css = `[data-look="${scope}"]{${vars(theme.light, accent)}}.dark [data-look="${scope}"]{${vars(theme.dark, accent)}}`;
  return <style>{css}</style>;
}

/** The Pro banner: a built-in pattern drawn in the accent (no uploads in V1). */
export function Banner({ pattern, scope }: { pattern: string; scope: string }) {
  if (pattern === "none") return null;
  const id = `banner-${scope}-${pattern}`;
  const shapes: Record<string, React.ReactNode> = {
    dots: <circle cx="6" cy="6" r="1.6" fill="var(--p-accent)" />,
    grid: <path d="M12 0H0V12" fill="none" stroke="var(--p-accent)" strokeWidth="1" />,
    diagonal: <path d="M-3 3L3 -3M0 12L12 0M9 15L15 9" stroke="var(--p-accent)" strokeWidth="1.5" />,
    waves: <path d="M0 6 Q3 2 6 6 T12 6" fill="none" stroke="var(--p-accent)" strokeWidth="1.2" />,
    hex: <path d="M6 1 L11 4 L11 9 L6 12 L1 9 L1 4 Z" fill="none" stroke="var(--p-accent)" strokeWidth="1" />,
  };
  return (
    <svg className="h-24 w-full opacity-40" aria-hidden>
      <defs>
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          {shapes[pattern]}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
