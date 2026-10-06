"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.user.getCurrentUser);
  const problems = useQuery(api.problems.list);

  if (user === undefined) {
    return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  }

  // Signed in with Clerk, but EnsureUser (or the webhook) hasn't created the
  // Convex row yet. Normally lasts a moment.
  if (user === null) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Setting up your account…
      </p>
    );
  }

  return (
    <div>
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Dashboard
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Welcome, {user.name}</h1>
      {user.username && <p className="mt-1 font-mono text-[13px] text-muted-foreground">@{user.username}</p>}
      <p className="mt-2 text-[13px] text-muted-foreground">
        Plan: <span className="font-mono">{user.tier}</span>
      </p>

      <section className="mt-10 max-w-md">
        <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Problems
        </p>
        <ul className="mt-3 divide-y rounded-md border text-[13px]">
          {problems?.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/solve/${p.slug}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-bg-secondary"
              >
                <span className="font-medium">{p.title}</span>
                <span className="text-muted-foreground capitalize">{p.difficulty}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
