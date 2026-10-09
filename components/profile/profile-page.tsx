"use client";

import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { ActivityGrid } from "@/components/profile/activity-grid";
import { Banner, fontVariables, headingFamily, LookStyle, type LookValues } from "@/components/profile/look";
import { RatingChart } from "@/components/profile/rating-chart";
import { TierName } from "@/components/progression/level-bar";
import { api } from "@/convex/_generated/api";
import { countryName } from "@/lib/countries";
import { LANGUAGE_NAMES } from "@/lib/share";
import { cn } from "@/lib/utils";

// Section headings: the eyebrow style in the profile's own muted colour.
const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-[var(--p-muted)] uppercase";
// The platform's eyebrow, for the fixed stats block.
const platformEyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

export type Profile = Extract<NonNullable<FunctionReturnType<typeof api.profiles.get>>, { redirect: null }>;
type Rating = Profile["stats"]["duel"];
export type About = Profile["about"];

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

function domain(link: string) {
  try {
    const url = new URL(link);
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return link;
  }
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
      <p className={platformEyebrow}>{label}</p>
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
      <p className={platformEyebrow}>{label}</p>
      <p className="mt-2 font-mono text-xl font-medium tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-[13px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

/**
 * The fixed stats block (design.md, Profiles): platform tokens only, the same
 * on every profile whatever its theme, and never hidden or moved.
 */
function StatsBlock({ stats }: { stats: Profile["stats"] }) {
  const record = stats.duel?.record;
  return (
    <section aria-label="Stats" className="rounded-md border bg-bg-secondary p-6 text-foreground">
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

function AboutSection({ about }: { about: About }) {
  if (!about.bio && about.links.length === 0 && about.languages.length === 0) return null;
  return (
    <section aria-labelledby="about">
      <h2 id="about" className={eyebrow}>
        About
      </h2>
      {about.bio && <p className="mt-3 max-w-prose text-[15px] leading-relaxed whitespace-pre-line">{about.bio}</p>}
      {(about.links.length > 0 || about.languages.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          {about.links.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="font-medium text-[var(--p-accent)] underline-offset-4 hover:underline"
            >
              {domain(link)}
            </a>
          ))}
          {about.languages.length > 0 && (
            <span className="flex flex-wrap gap-1.5" aria-label="Favourite languages">
              {about.languages.map((l) => (
                <span key={l} className="rounded-sm bg-[var(--p-surface)] px-2 py-0.5 text-xs">
                  {LANGUAGE_NAMES[l] ?? l}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

const DIFFICULTY = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

function PinnedSection({ pins }: { pins: Profile["pins"] }) {
  if (pins.length === 0) return null;
  return (
    <section aria-labelledby="pinned">
      <h2 id="pinned" className={eyebrow}>
        Pinned solutions
      </h2>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {pins.map((pin) => (
          <li key={pin.slug} className="min-w-0 rounded-md border border-[var(--p-border)] bg-[var(--p-surface)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3">
              <Link href={`/solve/${pin.slug}`} className="font-medium hover:underline">
                {pin.title}
              </Link>
              <span className="flex items-center gap-3 text-[13px] text-[var(--p-muted)]">
                {DIFFICULTY[pin.difficulty]}
                <span className="font-mono text-xs">{LANGUAGE_NAMES[pin.language] ?? pin.language}</span>
              </span>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto border-t border-[var(--p-border)] px-4 py-3 font-mono text-[13px] leading-5">
              <code>{pin.source}</code>
            </pre>
          </li>
        ))}
      </ul>
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
        <p className="font-mono text-xs text-[var(--p-muted)] tabular-nums">
          {earned.length} / {badges.length}
        </p>
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--p-muted)]">No badges yet.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {shown.map((b) => {
            const has = b.earnedAt !== null;
            return (
              <li
                key={b.id}
                title={b.description}
                className={cn(
                  "flex items-center gap-1.5 rounded-sm border border-[var(--p-border)] px-2 py-1 text-[13px]",
                  has ? "bg-[var(--p-surface)]" : "text-[var(--p-muted)]",
                )}
              >
                {has ? <Check className="size-3.5 text-[var(--p-accent)]" aria-hidden /> : <Lock className="size-3" aria-hidden />}
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
          className="mt-3 text-[13px] text-[var(--p-muted)] hover:text-[var(--p-text)]"
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
        <p className="mt-3 text-[13px] text-[var(--p-muted)]">No finished games yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--p-border)] border-y border-[var(--p-border)]">
          {games.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[13px]">
              {g.kind === "1v1" ? (
                <>
                  <span className={cn("w-12 font-medium", g.result === "win" && "text-[var(--p-accent)]")}>
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
                    {g.problem && <span className="text-[var(--p-muted)]"> · {g.problem}</span>}
                  </span>
                </>
              ) : (
                <>
                  <span className={cn("w-12 font-medium", g.place === 1 && "text-[var(--p-accent)]")}>{ordinal(g.place)}</span>
                  <span className="min-w-[12rem] flex-1 truncate">
                    Territory <span className="text-[var(--p-muted)]">· {g.players} players</span>
                  </span>
                </>
              )}
              <span className="ml-auto flex items-center gap-4 pl-16 font-mono text-xs text-[var(--p-muted)] tabular-nums sm:pl-0">
                {g.kind === "1v1" && (
                  <Link href={`/m/${g.id}`} className="font-sans text-[13px] hover:text-[var(--p-text)]">
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

function ActivitySection({ profile }: { profile: Profile }) {
  return (
    <section aria-labelledby="activity" className="min-w-0">
      <h2 id="activity" className={eyebrow}>
        Activity
      </h2>
      <div className="mt-3">
        <ActivityGrid activity={profile.activity} />
      </div>
    </section>
  );
}

function RatingSection({ profile }: { profile: Profile }) {
  return (
    <section aria-labelledby="rating" className="min-w-0">
      <h2 id="rating" className={eyebrow}>
        1v1 rating
      </h2>
      <div className="mt-3">
        {profile.ratingHistory.length >= 2 ? (
          <RatingChart points={profile.ratingHistory} />
        ) : (
          <p className="text-[13px] text-[var(--p-muted)]">
            {profile.stats.duel?.rating == null ? "Shown after 10 ranked games." : "The chart starts after a second rated game."}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * A profile drawn with a look (decisions §18): the theme's values and the Pro
 * options as CSS variables on this element, the fixed header and stats
 * block, then the sections in their order. Used by the page and the editor's
 * live preview, which passes draft values.
 */
export function ProfileView({
  profile,
  look,
  about,
  pins,
  action,
}: {
  profile: Profile;
  look: LookValues;
  about: About;
  pins: Profile["pins"];
  action?: React.ReactNode;
}) {
  const scope = useId().replace(/[^a-zA-Z0-9]/g, "");
  const hidden = new Set(look.sections.hidden);
  const sections: Record<string, React.ReactNode> = {
    about: <AboutSection about={about} />,
    pinned: <PinnedSection pins={pins} />,
    activity: <ActivitySection profile={profile} />,
    rating: <RatingSection profile={profile} />,
    badges: <Badges badges={profile.badges} />,
    recent: <RecentGames games={profile.recent} username={profile.username} />,
  };

  return (
    <div
      data-look={scope}
      className={cn(fontVariables, "overflow-hidden rounded-lg border border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text)]")}
    >
      <LookStyle scope={scope} look={look} />
      <Banner pattern={look.banner} scope={scope} />
      <div className="p-5 sm:p-8">
        <header className="flex flex-wrap items-start gap-5">
          {profile.imageUrl ? (
            // Clerk avatar URLs; next/image would need every Clerk host configured.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.imageUrl} alt="" className="size-20 rounded-full bg-[var(--p-surface)]" />
          ) : (
            <span className="size-20 rounded-full bg-[var(--p-surface)]" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-3xl text-balance sm:text-4xl" style={{ fontFamily: headingFamily(look.headingFont) }}>
                {profile.name}
              </h1>
              {profile.pro && <ProBadge />}
            </div>
            <p className="mt-1 font-mono text-[13px] text-[var(--p-muted)]">@{profile.username}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span>
                <span className="font-mono font-medium tabular-nums">Level {profile.level.level}</span>{" "}
                <span className="text-[var(--p-muted)]">· {profile.level.title}</span>
              </span>
              {profile.country && (
                <span className="text-[var(--p-muted)]">
                  <span aria-hidden>{flag(profile.country)} </span>
                  {countryName(profile.country)}
                </span>
              )}
              <span className="text-[var(--p-muted)]">Joined {monthYear(profile.joinedAt)}</span>
            </p>
          </div>
          {action}
        </header>

        <div className="mt-8">
          <StatsBlock stats={profile.stats} />
        </div>

        {look.sections.order
          .filter((s) => !hidden.has(s) && sections[s])
          .map((s) => (
            // Sections with nothing to show render nothing; :empty hides their gap.
            <div key={s} className="mt-10 empty:hidden">
              {sections[s]}
            </div>
          ))}
      </div>
    </div>
  );
}

/** A public profile (decisions §18). Rendered on the server for search, then live. */
export function ProfilePage({ preloaded }: { preloaded: Preloaded<typeof api.profiles.get> }) {
  const result = usePreloadedQuery(preloaded);
  const me = useQuery(api.user.getCurrentUser);
  if (!result || result.redirect !== null) return null;
  const mine = me?.username === result.username;

  return (
    <div className="mx-auto max-w-5xl">
      <ProfileView
        profile={result}
        look={result.look}
        about={result.about}
        pins={result.pins}
        action={
          mine && (
            <Link
              href="/settings/profile"
              className="rounded-md border border-[var(--p-border)] px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--p-surface)]"
            >
              Edit profile
            </Link>
          )
        }
      />
    </div>
  );
}
