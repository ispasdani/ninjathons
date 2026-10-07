"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { titleForLevel } from "@/convex/lib/levels";

/**
 * What an accepted Submit earned: XP, a new level, new badges. The brand
 * marks it as yours (design.md 2.7); Accepted itself stays green.
 */
export function Rewards({ submission }: { submission: Doc<"submissions"> }) {
  const earned = submission.badgesEarned ?? [];
  const badges = useQuery(api.badges.list, earned.length ? {} : "skip");

  if (submission.xpAwarded === undefined) {
    return (
      <p className="text-[13px] text-muted-foreground">
        No XP this time: you&apos;ve already solved this problem in this language. Try another language for more.
      </p>
    );
  }

  const names = earned.map((id) => badges?.find((b) => b.id === id)?.name ?? "…");
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]" role="status">
      <span className="rounded-xs bg-brand px-1.5 py-0.5 font-mono text-xs font-medium text-brand-foreground tabular-nums">
        +{submission.xpAwarded} XP
      </span>
      {submission.levelReached !== undefined && (
        <span className="font-medium">
          Level {submission.levelReached} reached · {titleForLevel(submission.levelReached)}
        </span>
      )}
      {names.length > 0 && (
        <Link href="/badges" className="text-text-secondary hover:underline">
          {names.length === 1 ? "Badge earned" : "Badges earned"}: {names.join(", ")}
        </Link>
      )}
    </div>
  );
}
