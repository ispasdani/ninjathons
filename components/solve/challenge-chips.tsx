"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CalendarDays, Flame, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";
import { duration } from "@/lib/duration";
import { useNow } from "@/lib/use-now";

/**
 * On today's daily or a problem of this week's set, the solve view's toolbar
 * shows a chip with the player's clock, and opening the page starts it (the
 * first opening counts, decisions §15). Their own components so the ticking
 * clock doesn't re-render the editor.
 */
export function ChallengeChips({ slug }: { slug: string }) {
  return (
    <>
      <DailyChip slug={slug} />
      <WeeklyChip slug={slug} />
    </>
  );
}

function DailyChip({ slug }: { slug: string }) {
  const { isAuthenticated } = useConvexAuth();
  const today = useQuery(api.daily.today);
  const open = useMutation(api.daily.open);
  const isDaily = today?.problem?.slug === slug;

  useEffect(() => {
    if (isDaily && isAuthenticated) void open({ slug });
  }, [isDaily, isAuthenticated, open, slug]);

  if (!isDaily) return null;
  const me = today.me;
  return <Chip href="/daily" icon={Flame} label="Daily" openedAt={me?.openedAt ?? null} timeMs={me?.timeMs ?? null} />;
}

function WeeklyChip({ slug }: { slug: string }) {
  const { isAuthenticated } = useConvexAuth();
  const current = useQuery(api.weekly.current);
  const open = useMutation(api.weekly.open);
  const problem = current?.set?.problems.find((p) => p.slug === slug);

  useEffect(() => {
    if (problem && isAuthenticated) void open({ slug });
  }, [problem, isAuthenticated, open, slug]);

  if (!problem) return null;
  return (
    <Chip
      href="/weekly"
      icon={CalendarDays}
      label={`Weekly · ${problem.points} pts`}
      openedAt={problem.openedAt}
      timeMs={problem.timeMs}
    />
  );
}

function Chip({
  href,
  icon: Icon,
  label,
  openedAt,
  timeMs,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  openedAt: number | null;
  timeMs: number | null;
}) {
  const now = useNow(1000);
  const time = timeMs !== null ? `solved in ${duration(timeMs)}` : openedAt ? duration(now - openedAt) : null;
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-xs border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      <Icon className="size-3.5 text-brand-text" aria-hidden />
      {label}
      {time && <span className="tabular-nums">· {time}</span>}
    </Link>
  );
}
