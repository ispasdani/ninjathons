"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.user.getCurrentUser);

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
      <p className="mt-2 text-[13px] text-muted-foreground">
        Plan: <span className="font-mono">{user.tier}</span>
      </p>
    </div>
  );
}
