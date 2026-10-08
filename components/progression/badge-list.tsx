"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Check, Lock } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const GROUPS = [
  ["milestones", "Milestones"],
  ["difficulty", "Difficulty"],
  ["languages", "Languages"],
  ["levels", "Levels"],
  ["1v1", "1v1"],
  ["challenges", "Challenges"],
] as const;

function rarityText(rarity: number) {
  if (rarity === 0) return "No one yet";
  const percent = rarity * 100;
  return `${percent < 1 ? "<1" : Math.round(percent)}% of players`;
}

/** Every badge by area, with its rarity and, when signed in, yours. */
export function BadgeList() {
  const badges = useQuery(api.badges.list);
  const { isAuthenticated } = useConvexAuth();
  const earned = badges?.filter((b) => b.earnedAt !== null).length ?? 0;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Progression</p>
          <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Badges</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Earned once, kept for good. Rarity is the share of players who hold each one.
          </p>
        </div>
        {isAuthenticated && badges && (
          <p className="font-mono text-[13px] tabular-nums">
            <span className="font-medium">{earned}</span>
            <span className="text-muted-foreground"> / {badges.length} earned</span>
          </p>
        )}
      </header>

      {badges === undefined ? (
        <p className="mt-8 text-[13px] text-muted-foreground">Loading…</p>
      ) : (
        GROUPS.map(([group, label]) => (
          <section key={group} className="mt-10">
            <h2 className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges
                .filter((b) => b.group === group)
                .map((badge) => {
                  const has = badge.earnedAt !== null;
                  return (
                    <li key={badge.id} className={cn("flex gap-3 rounded-md border p-4", has && "bg-bg-secondary")}>
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          has ? "bg-brand text-brand-foreground" : "bg-bg-tertiary text-muted-foreground",
                        )}
                      >
                        {has ? <Check className="size-4" aria-label="Earned" /> : <Lock className="size-3.5" aria-label="Locked" />}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-[13px] font-medium", !has && "text-text-secondary")}>{badge.name}</span>
                        <span className="block text-[13px] text-muted-foreground">{badge.description}</span>
                        <span className="mt-2 block font-mono text-xs text-muted-foreground tabular-nums">
                          {rarityText(badge.rarity)}
                          {has && ` · earned ${new Date(badge.earnedAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                        </span>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
