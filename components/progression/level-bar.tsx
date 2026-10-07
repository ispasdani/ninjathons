import { cn } from "@/lib/utils";

type Progress = { xp: number; level: number; title: string; levelXp: number; nextLevelXp: number };

/**
 * Level, title and the XP bar toward the next level. The bar is yours, so it
 * uses the brand fill (design.md 2.7).
 */
export function LevelBar({ progress, className }: { progress: Progress; className?: string }) {
  const { xp, level, title, levelXp, nextLevelXp } = progress;
  const span = nextLevelXp - levelXp;
  const done = Math.min(1, Math.max(0, (xp - levelXp) / span));
  return (
    <div className={className}>
      <p className="flex items-baseline gap-3">
        <span className="font-mono text-4xl font-medium tabular-nums">{level}</span>
        <span className="text-xl">{title}</span>
      </p>
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary"
        role="progressbar"
        aria-label={`Progress to level ${level + 1}`}
        aria-valuemin={levelXp}
        aria-valuemax={nextLevelXp}
        aria-valuenow={xp}
      >
        <div className="h-full bg-brand transition-[width] duration-500 ease-out-cubic motion-reduce:transition-none" style={{ width: `${done * 100}%` }} />
      </div>
      <p className="mt-2 flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
        <span>{xp.toLocaleString("en")} XP</span>
        <span>
          {(nextLevelXp - xp).toLocaleString("en")} to level {level + 1}
        </span>
      </p>
    </div>
  );
}

const TIER_COLOR: Record<string, string> = {
  Newbie: "text-tier-newbie",
  Apprentice: "text-tier-apprentice",
  Specialist: "text-tier-specialist",
  Expert: "text-tier-expert",
  Master: "text-tier-master",
  Grandmaster: "text-tier-grandmaster",
};

/** A rating tier: its name in its color, never color alone (design.md 2.5, 8). */
export function TierName({ tier, className }: { tier: string; className?: string }) {
  return <span className={cn("font-medium", TIER_COLOR[tier], className)}>{tier}</span>;
}
