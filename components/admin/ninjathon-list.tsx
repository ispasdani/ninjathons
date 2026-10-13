"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";

import { eyebrow, LocalTime, StageTag } from "@/components/ninjathons/parts";
import { Button } from "@/components/ui/button";
import { WindowCard } from "@/components/ui/window-card";
import { api } from "@/convex/_generated/api";

/** Every ninjathon, drafts and cancelled ones included, for admins (decisions §19). */
export function AdminNinjathonList() {
  const { isAuthenticated } = useConvexAuth();
  const events = useQuery(api.ninjathonsAdmin.list, isAuthenticated ? {} : "skip");

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Admin</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Ninjathons</h1>
        </div>
        <Button variant="brand" asChild>
          <Link href="/admin/ninjathons/new">New ninjathon</Link>
        </Button>
      </header>

      {events === undefined ? (
        <p className="mt-8 text-[13px] text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <p className="mt-8 border p-6 text-[13px] text-muted-foreground">No ninjathons yet.</p>
      ) : (
        <WindowCard file="ninjathons.exe" color="plain" className="mt-8" bodyClassName="block">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b text-left font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="py-3 pl-4 font-medium">Ninjathon</th>
                  <th className="py-3 pl-4 font-medium">Stage</th>
                  <th className="hidden py-3 pl-4 font-medium md:table-cell">Starts</th>
                  <th className="py-3 pr-4 text-right font-medium">Teams</th>
                  <th className="py-3 pr-4 text-right font-medium">Projects</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e._id} className="h-11 border-b last:border-b-0 hover:bg-bg-secondary">
                    <td className="py-2 pl-4">
                      <Link href={`/admin/ninjathons/${e._id}`} className="font-medium hover:underline">
                        {e.title}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">/{e.slug}</span>
                    </td>
                    <td className="pl-4">
                      <StageTag stage={e.stage} />
                    </td>
                    <td className="hidden pl-4 md:table-cell">
                      <LocalTime at={e.startsAt} />
                    </td>
                    <td className="pr-4 text-right font-mono tabular-nums">{e.teams}</td>
                    <td className="pr-4 text-right font-mono tabular-nums">{e.submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WindowCard>
      )}
    </div>
  );
}
