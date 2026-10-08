"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { TierName } from "@/components/progression/level-bar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { countryName } from "@/lib/countries";
import { duration } from "@/lib/duration";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export type BoardTab = "level" | "month" | "1v1" | "territory" | "daily" | "weekly" | "learning" | "learning-month";
export type Scope = "global" | "country" | "group";

const PAGE = 50;

const BOARDS: [BoardTab, string][] = [
  ["level", "Level"],
  ["month", "This month"],
  ["1v1", "1v1"],
  ["territory", "Territory"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["learning", "Learning"],
  ["learning-month", "Learning this month"],
];

const ABOUT: Record<BoardTab, string> = {
  level: "Total XP from every area. XP only goes up.",
  month: "XP earned this calendar month (UTC). Starts again on the 1st.",
  "1v1": "1v1 rating. Shown after 10 ranked games; hidden after 30 days without one.",
  territory: "Territory rating. Shown after 10 ranked games; hidden after 30 days without one.",
  daily: "Daily challenge streak, then total dailies solved. Miss a day without a freeze and the streak starts again.",
  weekly: "Points from this week's challenge set, then less total time. Starts again every Monday (UTC).",
  learning: "XP from finished lessons, tutorials and roadmap modules.",
  "learning-month": "Learning XP earned this calendar month (UTC). Starts again on the 1st.",
};

// What follows your value in the "You" row.
const UNIT_SUFFIX: Record<string, (value: number) => string> = {
  XP: () => "XP",
  Rating: () => "",
  Streak: (value) => (value === 1 ? "day" : "days"),
  Points: () => "points",
};

function updatedAgo(builtAt: number | null, now: number) {
  if (builtAt === null) return null;
  const minutes = Math.max(0, Math.floor((now - builtAt) / 60_000));
  return minutes < 1 ? "Updated just now" : `Updated ${minutes} min ago`;
}

/**
 * Leaderboards (roadmap, Progression; plan, Leaderboard). The board and scope
 * live in the URL so a view can be shared; paging stays in page state.
 */
export function Leaderboard({ board, scope, groupId }: { board: BoardTab; scope: Scope; groupId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.user.getCurrentUser);
  const groups = useQuery(api.groups.mine, isAuthenticated ? {} : "skip");
  const liveGroups = groups?.filter((g) => g.deletedAt === null) ?? [];
  const [fromRank, setFromRank] = useState(1);
  const now = useNow();

  const group = scope === "group" ? (liveGroups.find((g) => g._id === groupId) ?? liveGroups[0]) : undefined;
  const country = user?.country;

  const args =
    scope === "global"
      ? { scope }
      : scope === "country" && country
        ? { scope, country }
        : scope === "group" && group
          ? { scope, groupId: group._id as Id<"groups"> }
          : null;
  const data = useQuery(
    api.leaderboards.board,
    args ? { board: board === "month" ? "level-month" : board, ...args, fromRank, limit: PAGE } : "skip",
  );

  function go(next: { board?: BoardTab; scope?: Scope; group?: string | null }) {
    const params = new URLSearchParams();
    const b = next.board ?? board;
    const s = next.scope ?? scope;
    const g = next.group !== undefined ? next.group : (group?._id ?? null);
    if (b !== "level") params.set("board", b);
    if (s !== "global") params.set("scope", s);
    if (s === "group" && g) params.set("group", g);
    setFromRank(1);
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  const unit = board === "1v1" || board === "territory" ? "Rating" : board === "daily" ? "Streak" : board === "weekly" ? "Points" : "XP";
  const me = data?.me ?? null;

  return (
    <div>
      <header>
        <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Leaderboards</p>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Who&apos;s on top</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">{ABOUT[board]}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented label="Board" value={board} onChange={(b) => go({ board: b })} options={BOARDS} />
        <Segmented
          label="Scope"
          value={scope}
          onChange={(s) => go({ scope: s })}
          options={[
            ["global", "Global"],
            ["country", country ? countryName(country) : "Country"],
            ["group", "Group"],
          ]}
        />
        {scope === "group" && liveGroups.length > 1 && (
          <select
            aria-label="Group"
            value={group?._id}
            onChange={(e) => go({ group: e.target.value })}
            className="h-9 rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
          >
            {liveGroups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {args === null ? (
        // Until sign-in settles (and the user row loads) we can't tell which
        // empty state applies, so don't flash the signed-out one.
        authLoading || (isAuthenticated && (user === undefined || (scope === "group" && groups === undefined))) ? (
          <p className="mt-6 text-[13px] text-muted-foreground">Loading…</p>
        ) : (
          <Empty scope={scope} signedIn={isAuthenticated} />
        )
      ) : (
        <>
          {me && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-l-2 border-l-brand bg-bg-secondary px-4 py-3 text-[13px]">
              <span className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">You</span>
              <span className="font-mono tabular-nums">
                {me.rank ? `#${me.rank.toLocaleString("en")}` : "Not ranked yet"}
              </span>
              <span className="font-mono tabular-nums">
                {me.value.toLocaleString("en")} {UNIT_SUFFIX[unit](me.value)}
              </span>
              {me.rank === null && scope !== "group" && (
                <span className="text-muted-foreground">You&apos;ll appear within 5 minutes.</span>
              )}
              {me.rank && (
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setFromRank(Math.max(1, me.rank! - 5))}>
                  Jump to me
                </Button>
              )}
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-md border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b text-left font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="w-16 py-3 pl-4 text-right font-medium">Rank</th>
                  <th className="py-3 pl-6 font-medium">Player</th>
                  <th className="hidden py-3 pr-4 font-medium sm:table-cell">{board === "1v1" || board === "territory" ? "Tier" : board === "daily" ? "Solved" : board === "weekly" ? "Time" : "Level"}</th>
                  <th className="py-3 pr-4 text-right font-medium">{unit}</th>
                </tr>
              </thead>
              <tbody>
                {data === undefined ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                      {fromRank > 1
                        ? "No more players."
                        : board === "1v1" || board === "territory"
                          ? "No one is ranked yet. Players appear after 10 ranked games."
                          : board === "weekly"
                            ? "No points yet this week. Solve a problem from this week's set."
                            : board === "daily"
                              ? "No streaks yet. Solve today's daily to start one."
                              : board === "learning" || board === "learning-month"
                                ? "No one is here yet. Finish a lesson to be the first."
                                : "No one is here yet. Solve a problem to be the first."}
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => {
                    const mine = row.userId === user?._id;
                    return (
                      <tr
                        key={row.userId}
                        aria-current={mine ? "true" : undefined}
                        className={cn(
                          "h-11 border-b last:border-b-0 hover:bg-bg-secondary",
                          mine && "bg-brand/10 shadow-[inset_2px_0_0_var(--brand)] hover:bg-brand/15",
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
                            {row.country && (
                              <span className="font-mono text-xs text-muted-foreground" title={countryName(row.country)}>
                                {row.country}
                              </span>
                            )}
                            {mine && <span className="sr-only">(you)</span>}
                          </span>
                        </td>
                        <td className="hidden pr-4 sm:table-cell">
                          {"timeMs" in row ? (
                            <span className="font-mono tabular-nums">{duration(row.timeMs)}</span>
                          ) : "totalSolved" in row ? (
                            <span className="font-mono tabular-nums">{row.totalSolved.toLocaleString("en")}</span>
                          ) : "tier" in row ? (
                            <TierName tier={row.tier} />
                          ) : (
                            <span>
                              <span className="font-mono tabular-nums">{row.level}</span>{" "}
                              <span className="text-muted-foreground">{row.title}</span>
                            </span>
                          )}
                        </td>
                        <td className="pr-4 text-right font-mono tabular-nums">{row.value.toLocaleString("en")}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {scope === "group" ? "Live" : updatedAgo(data?.builtAt ?? null, now)}
            </p>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" disabled={fromRank === 1} onClick={() => setFromRank(Math.max(1, fromRank - PAGE))}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data || data.rows.length < PAGE}
                onClick={() => setFromRank(fromRank + PAGE)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ scope, signedIn }: { scope: Scope; signedIn: boolean }) {
  const text =
    scope === "country"
      ? signedIn
        ? "Set your country to see how you rank in it."
        : "Sign in and set your country to see this board."
      : signedIn
        ? "Join or create a group to see its board."
        : "Sign in to see your groups' boards.";
  const href = !signedIn ? "/sign-in" : scope === "country" ? "/settings" : "/groups";
  const label = !signedIn ? "Sign in" : scope === "country" ? "Set your country" : "Groups";
  return (
    <div className="mt-6 rounded-md border p-6 text-[13px]">
      <p className="text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" className="mt-4" asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
