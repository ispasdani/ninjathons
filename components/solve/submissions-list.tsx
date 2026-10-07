"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Language } from "@/convex/judge/types";
import { VerdictBadge } from "./verdict-panel";

function ago(time: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(time).toLocaleDateString();
}

/** Your own submissions to this problem, newest first. Opening one loads its code. */
export function SubmissionsList({
  slug,
  labels,
  onOpen,
}: {
  slug: string;
  labels: Partial<Record<Language, string>>;
  onOpen: (id: Id<"submissions">) => void;
}) {
  // Signed-in only: wait for Convex to have the token, or the query throws.
  const { isAuthenticated } = useConvexAuth();
  const rows = useQuery(api.submissions.mine, isAuthenticated ? { slug } : "skip");

  if (rows === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  if (rows.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Your runs and submissions for this problem will show up here.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b text-left font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
            <th className="py-2.5 pl-3 font-medium">Result</th>
            <th className="py-2.5 font-medium">Kind</th>
            <th className="py-2.5 font-medium">Language</th>
            <th className="py-2.5 pr-3 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s._id} className="h-11 border-b last:border-b-0 hover:bg-bg-secondary">
              <td className="pl-3">
                <button
                  type="button"
                  onClick={() => onOpen(s._id)}
                  title="Load this code into the editor"
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  {s.verdict ? (
                    <>
                      <VerdictBadge status={s.verdict.status} />
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {s.verdict.passed}/{s.verdict.total}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {s.status === "error" ? "Failed to run" : "Judging…"}
                    </span>
                  )}
                </button>
              </td>
              <td className="text-muted-foreground">{s.kind === "submit" ? "Submit" : "Run"}</td>
              <td>{labels[s.language] ?? s.language}</td>
              <td className="pr-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {s.verdict && `${s.verdict.timeMs} ms · `}
                {ago(s._creationTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
