"use client";

import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ActivityGrid } from "@/components/profile/activity-grid";
import { RatingChart } from "@/components/profile/rating-chart";
import { TierName } from "@/components/progression/level-bar";
import { api } from "@/convex/_generated/api";
import { countryName } from "@/lib/countries";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

type Profile = Extract<NonNullable<FunctionReturnType<typeof api.profiles.get>>, { redirect: null }>;
type Rating = Profile["stats"]["duel"];

function flag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function monthYear(at: number) {
  return new Date(at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function ago(at: number) {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

/** The Pro badge: the dark "metal" style at small size, never gold (design.md 2.6). */
function ProBadge() {
  return (
    <span className="rounded-xs border border-pro-border bg-pro px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.08em] text-pro-foreground uppercase">
      Pro
    </span>
  );
}

function RatingTile({ label, rating }: { label: string; rating: Rating }) {
  return (
    <div className="min-w-0">
      <p className={eyebrow}>{label}</p>
      {rating?.rating != null ? (
        <>
          <p className="mt-2 font-mono text-4xl font-medium tabular-nums">{rating.rating}</p>
          <p className="mt-1 text-[13px]">
            <TierName tier={rating.tier!} />
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-mono text-4xl font-medium text-muted-foreground">—</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {rating ? `Placement: ${rating.placementLeft} ranked games to go` : "Unrated"}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <p className={eyebrow}>{label}</p>
      <p className="mt-2 font-mono text-xl font-medium tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-[13px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

/**
 * The fixed stats block (design.md, Profiles): platform tokens only, the same
 * on every profile whatever its theme, and never hidden.
 */
function StatsBlock({ stats }: { stats: Profile["stats"] }) {
  const record = stats.duel?.record;
  return (
    <section aria-label="Stats" className="rounded-md border bg-bg-secondary p-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <RatingTile label="1v1" rating={stats.duel} />
        </div>
        <RatingTile label="Territory" rating={stats.territory} />
        <Stat label="Rank" value={stats.levelRank ? `#${stats.levelRank.toLocaleString("en")}` : "—"} detail="Global, by level" />
        <Stat
          label="1v1 record"
          value={record ? `${record.wins}–${record.losses}${record.draws ? `–${record.draws}` : ""}` : "—"}
          detail={record ? (record.draws ? "Won, lost, drawn" : "Won, lost") : "No ranked games"}
        />
        <Stat label="Solved" value={stats.solved.toLocaleString("en")} detail="Problems" />
        <Stat
          label="Daily streak"
          value={`${stats.streak.current} ${stats.streak.current === 1 ? "day" : "days"}`}
          detail={`Best ${stats.streak.best}`}
        />
      </div>
    </section>
  );
}

function Badges({ badges }: { badges: Profile["badges"] }) {
  const [showLocked, setShowLocked] = useState(false);
  const earned = badges.filter((b) => b.earnedAt !== null);
  const locked = badges.filter((b) => b.earnedAt === null);
  const shown = showLocked ? badges : earned;
  return (
    <section aria-labelledby="badges">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="badges" className={eyebrow}>
          Badges
        </h2>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {earned.length} / {badges.length}
        </p>
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">No badges yet.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {shown.map((b) => {
            const has = b.earnedAt !== null;
            return (
              <li
                key={b.id}
                title={b.description}
                className={cn(
                  "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[13px]",
                  has ? "bg-bg-secondary" : "text-muted-foreground",
                )}
              >
                {has ? <Check className="size-3.5 text-brand-text" aria-hidden /> : <Lock className="size-3" aria-hidden />}
                {b.name}
                <span className="sr-only">{has ? "(earned)" : "(locked)"}</span>
              </li>
            );
          })}
        </ul>
      )}
      {locked.length > 0 && (
        <button
          type="button"
          onClick={() => setShowLocked((s) => !s)}
          className="mt-3 text-[13px] text-muted-foreground hover:text-foreground"
          aria-expanded={showLocked}
        >
          {showLocked ? "Hide locked badges" : `Show ${locked.length} locked`}
        </button>
      )}
    </section>
  );
}

function RecentGames({ games, username }: { games: Profile["recent"]; username: string }) {
  return (
    <section aria-labelledby="recent">
      <h2 id="recent" className={eyebrow}>
        Recent games
      </h2>
      {games.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">No finished games yet.</p>
      ) : (
        <ul className="mt-3 divide-y border-y">
          {games.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[13px]">
              {g.kind === "1v1" ? (
                <>
                  <span className={cn("w-12 font-medium", g.result === "win" && "text-brand-text")}>
                    {g.result === "win" ? "Win" : g.result === "loss" ? "Loss" : "Draw"}
                  </span>
                  <span className="min-w-[12rem] flex-1 truncate">
                    1v1 {g.ghost ? "vs a recorded run of " : "vs "}
                    {g.opponent && g.opponent !== username ? (
                      <Link href={`/u/${g.opponent}`} className="font-medium hover:underline">
                        @{g.opponent}
                      </Link>
                    ) : (
                      <span className="font-medium">{g.opponent ? `@${g.opponent}` : "a deleted player"}</span>
                    )}
                    {g.problem && <span className="text-muted-foreground"> · {g.problem}</span>}
                  </span>
                </>
              ) : (
                <>
                  <span className={cn("w-12 font-medium", g.place === 1 && "text-brand-text")}>{ordinal(g.place)}</span>
                  <span className="min-w-[12rem] flex-1 truncate">
                    Territory <span className="text-muted-foreground">· {g.players} players</span>
                  </span>
                </>
              )}
              <span className="ml-auto flex items-center gap-4 pl-16 font-mono text-xs text-muted-foreground tabular-nums sm:pl-0">
                {g.kind === "1v1" && (
                  <Link href={`/m/${g.id}`} className="font-sans text-[13px] hover:text-foreground">
                    Result
                  </Link>
                )}
                <span className="w-16 text-right">
                  {!g.ranked ? "unranked" : g.ratingChange !== null ? signed(g.ratingChange) : "ranked"}
                </span>
                <span className="w-20 text-right">{ago(g.finishedAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A public profile (decisions §18). Rendered on the server for search, then live. */
export function ProfilePage({ preloaded }: { preloaded: Preloaded<typeof api.profiles.get> }) {
  const result = usePreloadedQuery(preloaded);
  const me = useQuery(api.user.getCurrentUser);
  if (!result || result.redirect !== null) return null;
  const profile = result;
  const mine = me?.username === profile.username;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start gap-5">
        {profile.imageUrl ? (
          // Clerk avatar URLs; next/image would need every Clerk host configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.imageUrl} alt="" className="size-20 rounded-full bg-bg-tertiary" />
        ) : (
          <span className="size-20 rounded-full bg-bg-tertiary" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-3xl text-balance sm:text-4xl">{profile.name}</h1>
            {profile.pro && <ProBadge />}
          </div>
          <p className="mt-1 font-mono text-[13px] text-muted-foreground">@{profile.username}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            <span>
              <span className="font-mono font-medium tabular-nums">Level {profile.level.level}</span>{" "}
              <span className="text-muted-foreground">· {profile.level.title}</span>
            </span>
            {profile.country && (
              <span className="text-muted-foreground">
                <span aria-hidden>{flag(profile.country)} </span>
                {countryName(profile.country)}
              </span>
            )}
            <span className="text-muted-foreground">Joined {monthYear(profile.joinedAt)}</span>
          </p>
        </div>
        {mine && (
          <Link href="/settings" className="text-[13px] text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        )}
      </header>

      <div className="mt-8">
        <StatsBlock stats={profile.stats} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="activity" className="min-w-0">
          <h2 id="activity" className={eyebrow}>
            Activity
          </h2>
          <div className="mt-3">
            <ActivityGrid activity={profile.activity} />
          </div>
        </section>
        <section aria-labelledby="rating" className="min-w-0">
          <h2 id="rating" className={eyebrow}>
            1v1 rating
          </h2>
          <div className="mt-3">
            {profile.ratingHistory.length >= 2 ? (
              <RatingChart points={profile.ratingHistory} />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {profile.stats.duel?.rating == null
                  ? "Shown after 10 ranked games."
                  : "The chart starts after a second rated game."}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <Badges badges={profile.badges} />
      </div>

      <div className="mt-10">
        <RecentGames games={profile.recent} username={profile.username} />
      </div>
    </div>
  );
}
