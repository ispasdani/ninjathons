"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

/** On a group page: the group's open Territory lobbies, and a way to open one. */
export function GroupLobbies({ groupId }: { groupId: Id<"groups"> }) {
  const lobbies = useQuery(api.territoryLobbies.ofGroup, { groupId });
  return (
    <section className="mt-4 rounded-md border p-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className={eyebrow}>Territory</p>
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <Link href={`/play/territory?group=${groupId}`}>Start a Territory lobby with the group</Link>
        </Button>
      </div>
      {lobbies && lobbies.length > 0 ? (
        <ul className="mt-4 divide-y rounded-md border">
          {lobbies.map((l) => (
            <li key={l.code} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]">
              <span className="font-medium">@{l.host}&apos;s lobby</span>
              <span className="text-muted-foreground">
                {l.ranked ? "Ranked" : "Unranked"} · {l.players} of 6
              </span>
              <Link href={`/lobby/${l.code}`} className="ml-auto font-medium hover:underline">
                Join
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground">
          No open lobbies. Open one and members can join from here; you start it once 3 are in.
        </p>
      )}
    </section>
  );
}
