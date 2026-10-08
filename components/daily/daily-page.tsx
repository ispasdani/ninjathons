"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Check, Flame, Snowflake } from "lucide-react";
import Link from "next/link";

import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { duration, timeLeft } from "@/lib/duration";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
// At most 2 freezes are held (decisions §15).
const MAX_FREEZES = 2;

/**
 * The Daily page (decisions §15): today's problem, the reset countdown, your
 * clock and streak, and today's fastest solves. Public; signed in, it's yours.
 */
export function DailyPage() {
  const { isAuthenticated } = useConvexAuth();
  const today = useQuery(api.daily.today);
  const fastest = useQuery(api.daily.fastest, {});
  const user = useQuery(api.user.getCurrentUser, isAuthenticated ? {} : "skip");
  const now = useNow(1000);

  if (today === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  const me = today.me;
  const solved = me?.solvedAt != null;

  return (
    <div className="max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className={eyebrow}>Daily challenge</p>
          <h1 className="mt-2 text-3xl text-balance sm:text-4xl">One problem, everyone, today</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Solve it before 00:00 UTC to keep your streak. Your time runs from when you first open it.
          </p>
        </div>
        <p className="font-mono text-[13px] text-muted-foreground tabular-nums">
          New problem in {timeLeft(today.endsAt - now)}
        </p>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div
          className={cn(
            "flex flex-col justify-between rounded-md border p-6 lg:col-span-2",
            solved && "border-l-2 border-l-brand",
          )}
        >
          {today.problem ? (
            <>
              <div>
                <p className={eyebrow}>{today.day}</p>
                <h2 className="mt-3 text-2xl">{today.problem.title}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  <Difficulty level={today.problem.difficulty} />
                  {today.problem.tags.map((tag) => (
                    <span key={tag} className="font-mono text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {!isAuthenticated ? (
                  <Button variant="brand" asChild>
                    <Link href="/sign-in">Sign in to play</Link>
                  </Button>
                ) : solved ? (
                  <>
                    <p className="flex items-center gap-2 text-[13px] font-medium">
                      <Check className="size-4 text-brand-text" aria-hidden />
                      Solved in <span className="font-mono tabular-nums">{duration(me!.timeMs!)}</span>
                    </p>
                    <Button variant="outline" asChild>
                      <Link href={`/solve/${today.problem.slug}`}>Open again</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="brand" asChild>
                      <Link href={`/solve/${today.problem.slug}`}>{me?.openedAt ? "Carry on" : "Solve"}</Link>
                    </Button>
                    {me?.openedAt && (
                      <p className="font-mono text-[13px] text-muted-foreground tabular-nums">
                        Your time: {duration(now - me.openedAt)}
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div>
              <p className={eyebrow}>{today.day}</p>
              <p className="mt-3 text-[13px] text-muted-foreground">
                Today&apos;s problem is being picked. Check back in a few minutes.
              </p>
            </div>
          )}
        </div>

        <StreakCard me={me} signedIn={isAuthenticated} />
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl">Fastest today</h2>
          <Link href="/leaderboards?board=daily" className="text-[13px] text-brand-text hover:underline">
            Daily board: longest streaks
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b text-left font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                <th className="w-16 py-3 pl-4 text-right font-medium">Rank</th>
                <th className="py-3 pl-6 font-medium">Player</th>
                <th className="hidden py-3 pr-4 font-medium sm:table-cell">Language</th>
                <th className="py-3 pr-4 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {fastest === undefined ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : fastest.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    No one has solved it yet today. Be the first.
                  </td>
                </tr>
              ) : (
                fastest.map((row) => {
                  const mine = row.userId === user?._id;
                  return (
                    <tr
                      key={row.userId}
                      aria-current={mine ? "true" : undefined}
                      className={cn(
                        "h-11 border-b last:border-b-0",
                        mine && "bg-brand/10 shadow-[inset_2px_0_0_var(--brand)]",
                      )}
                    >
                      <td className="pl-4 text-right font-mono font-medium tabular-nums">{row.rank}</td>
                      <td className="pl-6">
                        <span className="flex items-center gap-3">
                          {row.imageUrl ? (
                            // Clerk avatar URLs; next/image would need every Clerk host configured.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.imageUrl} alt="" className="size-6 rounded-full bg-bg-tertiary" />
                          ) : (
                            <span className="size-6 rounded-full bg-bg-tertiary" />
                          )}
                          <span className="font-medium">{row.username ? `@${row.username}` : row.name}</span>
                          {mine && <span className="sr-only">(you)</span>}
                        </span>
                      </td>
                      <td className="hidden pr-4 text-muted-foreground sm:table-cell">{row.language ?? "–"}</td>
                      <td className="pr-4 text-right font-mono tabular-nums">{duration(row.timeMs)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type Me = {
  streak: number;
  best: number;
  freezes: number;
  totalSolved: number;
  atRisk: boolean;
} | null;

function StreakCard({ me, signedIn }: { me: Me; signedIn: boolean }) {
  if (!signedIn || !me) {
    return (
      <div className="rounded-md border bg-bg-secondary p-6">
        <p className={eyebrow}>Streak</p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Solve the daily on consecutive days to build a streak. Every 7 days earns a freeze that covers a missed day.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-bg-secondary p-6">
      <p className={eyebrow}>Your streak</p>
      <p className="mt-3 flex items-baseline gap-2">
        <Flame className={cn("size-6 self-center", me.streak > 0 ? "text-brand-text" : "text-muted-foreground")} aria-hidden />
        <span className="font-mono text-4xl font-medium tabular-nums">{me.streak}</span>
        <span className="text-[13px] text-muted-foreground">{me.streak === 1 ? "day" : "days"}</span>
      </p>
      {me.atRisk && <p className="mt-2 text-[13px] font-medium">Solve today&apos;s to keep it going.</p>}
      <dl className="mt-5 grid grid-cols-3 gap-3 text-[13px]">
        <div>
          <dt className="text-muted-foreground">Best</dt>
          <dd className="font-mono tabular-nums">{me.best}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Solved</dt>
          <dd className="font-mono tabular-nums">{me.totalSolved}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Freezes</dt>
          <dd className="flex items-center gap-0.5" aria-label={`${me.freezes} of ${MAX_FREEZES}`}>
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <Snowflake
                key={i}
                aria-hidden
                className={cn("size-4", i < me.freezes ? "text-foreground" : "text-border")}
              />
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}
