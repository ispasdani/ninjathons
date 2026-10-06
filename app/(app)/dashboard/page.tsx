"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.user.getCurrentUser);
  const problems = useQuery(api.problems.library);

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

  return (
    <div>
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Dashboard</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Welcome, {user.name}</h1>
      {user.username && <p className="mt-1 font-mono text-[13px] text-muted-foreground">@{user.username}</p>}

      <section className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="rounded-md border bg-bg-secondary p-6">
          <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Solved</p>
          <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
            {solved}
            <span className="text-lg text-muted-foreground"> / {total}</span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary">
            <div className="h-full bg-brand" style={{ width: `${total ? (solved / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-md border p-6">
          <div>
            <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {next?.status === "attempted" ? "Carry on" : "Next up"}
            </p>
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
        </div>
      </section>
    </div>
  );
}
