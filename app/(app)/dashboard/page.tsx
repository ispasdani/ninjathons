"use client";

import { useQuery } from "convex/react";
import { Flame } from "lucide-react";
import Link from "next/link";

import { LevelBar } from "@/components/progression/level-bar";
import { Button } from "@/components/ui/button";
import { WindowCard } from "@/components/ui/window-card";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

export default function DashboardPage() {
  const user = useQuery(api.user.getCurrentUser);
  const problems = useQuery(api.problems.library);
  const badges = useQuery(api.badges.list);
  const board = useQuery(api.leaderboards.board, { board: "level", scope: "global", limit: 1 });
  const daily = useQuery(api.daily.today);
  const weekly = useQuery(api.weekly.current);

  if (user === undefined) {
    return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  }

  // Signed in with Clerk, but EnsureUser (or the webhook) hasn't created the
  // Convex row yet. Normally lasts a moment.
  if (user === null) {
    return <p className="text-[13px] text-muted-foreground">Setting up your account…</p>;
  }

  const solved = problems?.filter((p) => p.status === "solved").length ?? 0;
  const total = problems?.length ?? 0;
  // Where to carry on: an attempted problem first, else the first unsolved one.
  const next = problems?.find((p) => p.status === "attempted") ?? problems?.find((p) => p.status !== "solved");
  const earned = badges?.filter((b) => b.earnedAt !== null) ?? [];
  // Newest first, for the "latest badges" line.
  const latest = [...earned].sort((a, b) => b.earnedAt! - a.earnedAt!).slice(0, 3);
  const rank = board?.me?.rank ?? null;

  return (
    <div>
      <p className={eyebrow}>Dashboard</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Welcome, {user.name}</h1>
      {user.username && <p className="mt-1 font-mono text-[13px] text-muted-foreground">@{user.username}</p>}

      {/* Windows (components/ui/window-card.tsx): a mode keeps its colour from the
          home page, the rest are colourless. */}
      <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WindowCard file="level.exe" color="purple" className="md:col-span-2 lg:col-span-1" bodyClassName="p-6">
          <p className={eyebrow}>Level</p>
          <LevelBar progress={user.progress} className="mt-3" />
        </WindowCard>
        <WindowCard file="solved.exe" color="plain" bodyClassName="block p-6">
          <p className={eyebrow}>Solved</p>
          <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
            {solved}
            <span className="text-lg text-muted-foreground"> / {total}</span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary">
            <div className="h-full bg-brand" style={{ width: `${total ? (solved / total) * 100 : 0}%` }} />
          </div>
        </WindowCard>
        <WindowCard file="next_up.exe" color="ink" bodyClassName="justify-between p-6">
          <div>
            <p className={eyebrow}>{next?.status === "attempted" ? "Carry on" : "Next up"}</p>
            <p className="mt-3 text-xl">{next ? next.title : "All solved. Nice work."}</p>
          </div>
          <div className="mt-6 flex gap-2">
            {next && (
              <Button variant="brand" asChild>
                <Link href={`/solve/${next.slug}`}>Solve</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/problems">All problems</Link>
            </Button>
          </div>
        </WindowCard>

        <WindowCard file="daily.exe" color="orange" href="/daily" bodyClassName="block p-6">
          <p className={eyebrow}>Daily challenge</p>
          <p className="mt-3 flex items-baseline gap-2">
            <Flame
              className={cn("size-6 self-center", daily?.me?.streak ? "text-brand-text" : "text-muted-foreground")}
              aria-hidden
            />
            <span className="font-mono text-4xl font-medium tabular-nums">{daily?.me?.streak ?? 0}</span>
            <span className="text-[13px] text-muted-foreground">day streak</span>
          </p>
          <p className="mt-2 truncate text-[13px] text-muted-foreground">
            {!daily?.problem
              ? "Today's problem is on its way."
              : daily.me?.solvedAt != null
                ? `Solved today: ${daily.problem.title}`
                : `Today: ${daily.problem.title}`}
          </p>
        </WindowCard>
        <WindowCard file="weekly.exe" color="yellow" href="/weekly" bodyClassName="block p-6">
          <p className={eyebrow}>Weekly challenge</p>
          <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
            {weekly?.me?.points ?? 0}
            {weekly?.set && <span className="text-lg text-muted-foreground"> / {weekly.set.maxPoints}</span>}
          </p>
          <p className="mt-2 truncate text-[13px] text-muted-foreground">
            {weekly?.set ? `This week: ${weekly.set.title}` : "No set this week. The next starts on Monday."}
          </p>
        </WindowCard>
        <WindowCard file="leaderboard.exe" color="blue" href="/leaderboards" bodyClassName="block p-6">
          <p className={eyebrow}>Leaderboard</p>
          <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
            {rank ? `#${rank.toLocaleString("en")}` : "–"}
          </p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {rank ? "Your place on the Level board." : "Solve a problem to get on the board."}
          </p>
        </WindowCard>
        <WindowCard file="badges.exe" color="pink" href="/badges" bodyClassName="block p-6">
          <p className={eyebrow}>Badges</p>
          <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
            {earned.length}
            <span className="text-lg text-muted-foreground"> / {badges?.length ?? "…"}</span>
          </p>
          <p className="mt-2 truncate text-[13px] text-muted-foreground">
            {latest.length ? `Latest: ${latest.map((b) => b.name).join(", ")}` : "None yet. Your first solve earns one."}
          </p>
        </WindowCard>
        <WindowCard file="groups.exe" color="green" href="/groups" bodyClassName="block p-6">
          <p className={eyebrow}>Groups</p>
          <p className="mt-3 text-xl">Compete with your team</p>
          <p className="mt-2 text-[13px] text-muted-foreground">Create a group or join one with an invite code.</p>
        </WindowCard>
      </section>
    </div>
  );
}
