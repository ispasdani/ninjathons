"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Check } from "lucide-react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { duration, timeLeft } from "@/lib/duration";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

/**
 * The Weekly page (decisions §15): this week's themed set, each problem with
 * its points and your clock, your total, and the time left. Public; signed
 * in, the progress is yours.
 */
export function WeeklyPage() {
  const { isAuthenticated } = useConvexAuth();
  const current = useQuery(api.weekly.current);
  const now = useNow(1000);

  if (current === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  const { set, me } = current;

  return (
    <div className="max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className={eyebrow}>Weekly challenge · {current.week}</p>
          <h1 className="mt-2 text-3xl text-balance sm:text-4xl">{set ? set.title : "No set this week"}</h1>
        </div>
        {set && (
          <p className="font-mono text-[13px] text-muted-foreground tabular-nums">
            Ends in {timeLeft(current.endsAt - now)}
          </p>
        )}
      </header>

      {!set ? (
        <div className="mt-8 rounded-md border p-6 text-[13px]">
          <p className="text-muted-foreground">
            There&apos;s no weekly set this week. A new one starts on Monday at 00:00 UTC; the daily challenge runs every
            day in the meantime.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/daily">Daily challenge</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-text-secondary [&_a]:text-brand-text [&_a]:underline [&_code]:font-mono [&_code]:text-[13px]">
            <Markdown remarkPlugins={[remarkGfm]}>{set.theme}</Markdown>
          </div>

          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            <ol className="divide-y rounded-md border lg:col-span-2" aria-label="Problems">
              {set.problems.map((p, i) => {
                const solved = p.solvedAt !== null;
                return (
                  <li
                    key={p.slug}
                    className={cn(
                      "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:flex-nowrap",
                      solved && "shadow-[inset_2px_0_0_var(--brand)]",
                    )}
                  >
                    <span className="w-5 font-mono text-[13px] text-muted-foreground tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px]">
                        <Difficulty level={p.difficulty} />
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{p.points} points</span>
                      </div>
                    </div>
                    <div className="ml-9 flex items-center gap-3 sm:ml-0">
                      {solved ? (
                        <span className="flex items-center gap-1.5 font-mono text-[13px] tabular-nums">
                          <Check className="size-4 text-brand-text" aria-label="Solved" />
                          {duration(p.timeMs!)}
                        </span>
                      ) : (
                        p.openedAt !== null && (
                          <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
                            {duration(now - p.openedAt)}
                          </span>
                        )
                      )}
                      {isAuthenticated && (
                        <Button variant={solved ? "outline" : "brand"} size="sm" asChild>
                          <Link href={`/solve/${p.slug}`}>{solved ? "Open" : p.openedAt ? "Carry on" : "Solve"}</Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <YourWeek
              me={me}
              signedIn={isAuthenticated}
              maxPoints={set.maxPoints}
              problems={set.problems.length}
              xp={set.xp}
            />
          </section>

          <p className="mt-6 text-[13px] text-muted-foreground">
            Each problem&apos;s clock starts when you first open it; less total time breaks ties.{" "}
            <Link href="/leaderboards?board=weekly" className="text-brand-text hover:underline">
              Weekly board
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function YourWeek({
  me,
  signedIn,
  maxPoints,
  problems,
  xp,
}: {
  me: { points: number; timeMs: number; solved: number } | null;
  signedIn: boolean;
  maxPoints: number;
  problems: number;
  xp: { perProblem: number; fullSet: number };
}) {
  const rewards = `${xp.perProblem} XP per problem, ${xp.fullSet} more for the full set. The top 10% earn a badge.`;
  if (!signedIn || !me) {
    return (
      <div className="rounded-md border bg-bg-secondary p-6">
        <p className={eyebrow}>Your week</p>
        <p className="mt-3 text-[13px] text-muted-foreground">{rewards}</p>
        <Button variant="brand" size="sm" className="mt-4" asChild>
          <Link href="/sign-in">Sign in to play</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-bg-secondary p-6">
      <p className={eyebrow}>Your week</p>
      <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
        {me.points}
        <span className="text-lg text-muted-foreground"> / {maxPoints}</span>
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary">
        <div className="h-full bg-brand" style={{ width: `${maxPoints ? (me.points / maxPoints) * 100 : 0}%` }} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <dt className="text-muted-foreground">Solved</dt>
          <dd className="font-mono tabular-nums">
            {me.solved} / {problems}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Time</dt>
          <dd className="font-mono tabular-nums">{duration(me.timeMs)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-[13px] text-muted-foreground">{rewards}</p>
    </div>
  );
}
