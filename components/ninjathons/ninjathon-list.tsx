"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { PlayTabs } from "@/components/play/play-tabs";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import { eyebrow, LocalTime, StageTag, teamSize } from "./parts";

type Event = FunctionReturnType<typeof api.ninjathons.list>["running"][number];

/** Every published ninjathon: running, then upcoming, then past (decisions §19). */
export function NinjathonList() {
  const events = useQuery(api.ninjathons.list);
  const user = useQuery(api.user.getCurrentUser);

  return (
    <div className="max-w-5xl">
      <PlayTabs />
      <header className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className={eyebrow}>Ninjathons</p>
          {user?.role === "admin" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ninjathons">Manage</Link>
            </Button>
          )}
        </div>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Build something, against the clock</h1>
        <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
          A brief, a deadline and judges. Enter alone or with a team, hand in a repository and a short demo, and get
          judged against the rubric.
        </p>
      </header>

      {events === undefined ? (
        <p className="mt-8 text-[13px] text-muted-foreground">Loading…</p>
      ) : events.running.length + events.upcoming.length + events.past.length === 0 ? (
        <div className="mt-8 rounded-md border p-6 text-[13px] text-muted-foreground">
          No ninjathons yet. The first one will be announced here.
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <Section title="Running now" events={events.running} />
          <Section title="Coming up" events={events.upcoming} />
          <Section title="Past" events={events.past} />
        </div>
      )}
    </div>
  );
}

function Section({ title, events }: { title: string; events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl">{title}</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <li key={event._id}>
            <Link
              href={`/ninjathons/${event.slug}`}
              className="flex h-full flex-col rounded-md border p-6 transition-colors duration-150 ease-out-quad hover:border-border-strong hover:bg-bg-secondary"
            >
              <StageTag stage={event.stage} />
              <h3 className="mt-3 text-lg font-medium">{event.title}</h3>
              {event.teaser && <p className="mt-1 text-[13px] text-text-secondary">{event.teaser}</p>}
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                <dt>Starts</dt>
                <dd className="text-foreground">
                  <LocalTime at={event.startsAt} />
                </dd>
                <dt>Ends</dt>
                <dd className="text-foreground">
                  <LocalTime at={event.endsAt} />
                </dd>
                <dt>Teams</dt>
                <dd className="text-foreground">
                  {teamSize(event.minTeam, event.maxTeam)} · {event.teams} registered
                </dd>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
