/**
 * Levels and titles from total XP (roadmap, Progression). Everyone starts at
 * level 1, and reaching level n + 1 takes 100 × n^1.5 XP in total, so early
 * levels come fast and later ones slow (decisions §13).
 */

// Placeholder names (roadmap); they avoid the rating-tier words on purpose.
const TITLES = [
  { from: 1, title: "Initiate" },
  { from: 5, title: "Coder" },
  { from: 10, title: "Debugger" },
  { from: 15, title: "Builder" },
  { from: 20, title: "Engineer" },
  { from: 30, title: "Architect" },
  { from: 40, title: "Sensei" },
  { from: 50, title: "Legend" },
] as const;

export type Title = (typeof TITLES)[number]["title"];

/** Total XP needed to reach `level`. */
export function xpForLevel(level: number) {
  return level <= 1 ? 0 : Math.round(100 * (level - 1) ** 1.5);
}

export function levelForXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function titleForLevel(level: number): Title {
  let title: Title = TITLES[0].title;
  for (const band of TITLES) if (level >= band.from) title = band.title;
  return title;
}

/** Everything the XP bar needs. */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  return {
    xp,
    level,
    title: titleForLevel(level),
    // Total XP where this level started and where the next one begins.
    levelXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
  };
}
