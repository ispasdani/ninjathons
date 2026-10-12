import {
  BookOpen,
  CalendarDays,
  Code,
  Flame,
  GraduationCap,
  Hexagon,
  Map as MapIcon,
  Search,
  Star,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyCode, DailyCountdown, LevelDemo, LeaderboardDemo, TitleBands } from "./demos";
import { HeroDemo } from "./hero-demo";
import { WindowCard, type WinColor } from "./window-card";

// Section layout from the mockups canvas (Marketing homepage), on the design
// tokens so it works in both themes and at phone width.
const container = "mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-8";
const pad = "py-16 sm:py-24";
const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";
const h2 = "text-[28px] leading-[1.12] sm:text-4xl sm:leading-10";
const card = "rounded-md border bg-card";
const muted = "border-y bg-bg-secondary/50";

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(eyebrow, className)}>{children}</span>;
}

function Tag({ pro, children }: { pro?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        // At least 4 characters wide (plus padding and border), so PRO lines up with FREE.
        "inline-block min-w-[calc(4ch+16px)] shrink-0 rounded-xs border px-[7px] py-0.5 text-center font-mono text-[11px] font-medium",
        pro ? "border-transparent bg-pro text-pro-foreground" : "text-text-secondary",
      )}
    >
      {children}
    </span>
  );
}

function SectionHead({ label, title, aside, action }: { label: string; title: string; aside?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end md:gap-8">
      <div className="flex flex-col gap-3">
        <Eyebrow>{label}</Eyebrow>
        <h2 className={h2}>{title}</h2>
      </div>
      {aside && <p className="max-w-[440px] text-sm text-text-secondary md:text-right">{aside}</p>}
      {action}
    </div>
  );
}

const CHIPS: [LucideIcon, string][] = [
  [Code, "Algorithms"],
  [Swords, "Ranked 1v1"],
  [Trophy, "Daily challenges"],
  [Users, "Team ninjathons"],
  [MapIcon, "Territory"],
  [GraduationCap, "Roadmaps"],
];

export function Hero() {
  return (
    <section className={cn(container, "grid items-center gap-12 pt-16 pb-14 sm:pt-24 lg:grid-cols-2 lg:gap-16 lg:pb-20")}>
      <div className="flex flex-col gap-6">
        <Eyebrow>Coding challenges · 1v1 · Territory · Ninjathons</Eyebrow>
        <h1 className="text-[40px] leading-[1.08] sm:text-6xl sm:leading-[66px]">
          Solve problems. Beat people. Actually get better.
        </h1>
        <p className="max-w-[540px] text-lg leading-[29px] text-text-secondary">
          AI can write code in seconds. It won&apos;t sit your interview or fix the outage for you. Race other developers
          in 1v1 and Territory matches, follow roadmaps, and level up with every problem you solve.
        </p>
        <ul className="flex flex-wrap gap-2">
          {CHIPS.map(([Icon, label]) => (
            <li key={label} className="inline-flex items-center gap-1.5 rounded-sm bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary">
              <Icon className="size-3.5" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          {/* The page's one brand button (design.md 2.7). */}
          <Button size="lg" variant="brand" asChild>
            <Link href="/sign-up">Start free</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href="#modes">See the modes</a>
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Free forever for practice, matches, challenges, ninjathons and every leaderboard.
        </span>
      </div>
      <HeroDemo />
    </section>
  );
}

const LANGUAGES = ["JavaScript", "TypeScript", "Python 3.14", "Java 25", "C# 14", "C++20", "Rust", "HTML", "CSS"];

export function Languages() {
  return (
    <section className={cn(container, "flex flex-wrap items-center gap-x-6 gap-y-3 pb-16 sm:pb-20")}>
      <Eyebrow>Languages at launch</Eyebrow>
      <ul className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <li key={l} className="rounded-sm bg-bg-secondary px-2.5 py-1 font-mono text-xs text-text-secondary">
            {l}
          </li>
        ))}
      </ul>
    </section>
  );
}

const MODES: { name: string; file: string; color: WinColor; href: string; icon: LucideIcon; access: string; ranked?: boolean; desc: string }[] = [
  { name: "Practice", file: "practice.exe", color: "orange", href: "/problems", icon: BookOpen, access: "Free", desc: "Every problem in the library, in any language, with the docs panel open. Earns XP, never costs rating." },
  { name: "1v1 race", file: "race_1v1.exe", color: "pink", href: "/play", icon: Swords, access: "Free", ranked: true, desc: "Find a ranked match, challenge a friend by username or link, or race a ghost when nobody's online." },
  { name: "Territory", file: "territory.exe", color: "green", href: "/play", icon: Hexagon, access: "Free", ranked: true, desc: "3 to 6 players on one hex map. Solve problems to claim regions and take them from rivals." },
  { name: "Daily and weekly challenges", file: "daily.exe", color: "yellow", href: "/daily", icon: CalendarDays, access: "Free", desc: "One problem a day and a themed set every week, with streaks and their own leaderboards." },
  { name: "Roadmaps and tutorials", file: "roadmaps.exe", color: "purple", href: "/learn", icon: GraduationCap, access: "Pro", desc: "Guided paths from your first loop to interview-ready. Tutorials and the first module of every roadmap are free." },
  { name: "Ninjathons", file: "ninjathons.exe", color: "blue", href: "/ninjathons", icon: Users, access: "Free to join", desc: "Team events we run, with a brief, a deadline, judges and prizes." },
];

export function Modes() {
  return (
    <section id="modes" className={cn("scroll-mt-16 border-t", pad)}>
      <div className={cn(container, "flex flex-col gap-10")}>
        <SectionHead label="Modes" title="Play, learn and compete" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => (
            <WindowCard key={m.name} file={m.file} color={m.color} href={m.href} bodyClassName="gap-3 p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-[10px] bg-bg-secondary">
                  <m.icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="flex gap-1.5">
                  <Tag pro={m.access === "Pro"}>{m.access}</Tag>
                  {m.ranked && <Tag>Ranked</Tag>}
                </span>
              </div>
              <span className="text-[17px] font-medium">{m.name}</span>
              <span className="text-sm leading-[21px] text-text-secondary">{m.desc}</span>
            </WindowCard>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEP_COLORS: WinColor[] = ["orange", "yellow", "green", "pink"];
const STEPS = [
  ["Pick a mode", "Practice alone, find a 1v1 or Territory match, or take today's challenge."],
  ["Solve in the browser", "A real editor, sample tests on Run, and the docs library a tab away."],
  ["Hidden tests decide", "Submit runs every hidden test in an isolated sandbox. Verdicts arrive live."],
  ["You rank and level up", "Separate ratings for 1v1 and Territory, plus XP, titles and badges for everything you do."],
];

export function HowItWorks() {
  return (
    <section className={cn(muted, pad)}>
      <div className={cn(container, "flex flex-col gap-10")}>
        <SectionHead label="How it works" title="From problem to ranking in four steps" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex">
              <WindowCard file={`step_0${i + 1}.exe`} color={STEP_COLORS[i]} className="grow" bodyClassName="gap-2.5 p-6">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-base font-medium">{title}</span>
                <span className="text-sm leading-[21px] text-text-secondary">{text}</span>
              </WindowCard>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const PRINCIPLES = [
  ["01", "Understand first", "Restate the problem in your own words before writing a line."],
  ["02", "Get it working", "A slow, correct solution beats a fast, wrong one. Start there."],
  ["03", "Find the waste", "Hints ask what your code repeats, until you see it yourself."],
  ["04", "Prove it without help", "Ranked matches show what you can do on your own."],
];

// Always dark: the `dark` class switches the tokens inside it.
export function Learning() {
  return (
    <section id="learning" className="dark border-y bg-background py-20 text-foreground sm:py-28">
      <div className={cn(container, "flex flex-col gap-14")}>
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <Eyebrow>Learning</Eyebrow>
            <h2 className="text-[36px] leading-[1.08] sm:text-[56px] sm:leading-[60px]">
              AI should build your skills, not replace them.
            </h2>
          </div>
          <div className="flex flex-col gap-4 text-[17px] leading-[27px] text-[#d4d4d4]">
            <p>
              Plenty of developers worry that AI will take their job. The ones who stay valuable can still reason
              through a problem when the tools are off.
            </p>
            <p>
              So we build for the other way round. Hints ask questions, point you to the right page of the docs, and
              never hand over working code. You do the thinking, and the skill stays with you.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3.5 rounded-lg border bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow className="text-[11px]">A typical AI chat</Eyebrow>
              <Tag>YOU LEARN LITTLE</Tag>
            </div>
            <p className="text-sm leading-[21px] text-muted-foreground">
              &ldquo;Here is the complete solution. Paste it in and submit.&rdquo;
            </p>
            <pre className="overflow-x-auto rounded-[10px] border bg-background px-3.5 py-3 font-mono text-xs leading-[19px] text-[#8a8a8a]">
              {"def merge(intervals):\n    intervals.sort()\n    ...  # 12 more lines you didn't write"}
            </pre>
          </div>
          <div className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-border-strong bg-bg-secondary p-6">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow className="text-[11px] text-foreground">A Ninjathons hint</Eyebrow>
              <span className="rounded-xs bg-foreground px-[7px] py-0.5 font-mono text-[11px] font-medium text-background">
                YOU LEARN IT
              </span>
            </div>
            <p className="text-sm leading-[21px]">
              &ldquo;Your loop compares every pair. If the intervals were sorted by start, which one would you need to
              compare against?&rdquo;
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-sm bg-bg-tertiary px-2 py-1 font-mono text-[11px] text-[#d4d4d4]">docs › sorting HOWTO</span>
              <span className="rounded-sm bg-bg-tertiary px-2 py-1 font-mono text-[11px] text-[#d4d4d4]">no code until you solve it</span>
            </div>
          </div>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {PRINCIPLES.map(([n, title, text]) => (
            <li key={n} className="flex flex-col gap-2 border-t border-[#3f3f46] pt-4.5">
              <span className="font-mono text-xs text-muted-foreground">{n}</span>
              <span className="text-base font-medium">{title}</span>
              <span className="text-sm leading-[21px] text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col justify-between gap-6 border-t pt-8 md:flex-row md:items-center">
          <p className="max-w-[760px] text-[22px] leading-[30px] tracking-tight">
            In the end it comes down to what you can do with no tool, no model, just you and the problem. That&apos;s
            what we train.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/problems">Try a problem</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/learn">See roadmaps</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// learn/roadmaps/data-structures-and-algorithms: 5 modules, the first free.
const DSA: [name: string, state: "done" | "now" | "next" | "pro", lessons: string][] = [
  ["Arrays and hashing", "done", "4 / 4"],
  ["Searching and sorting", "now", "1 / 3"],
  ["Stacks, windows and heaps", "next", "0 / 3"],
  ["Graphs", "next", "0 / 3"],
  ["Dynamic programming and greedy", "next", "0 / 3"],
];

export function Roadmaps() {
  return (
    <section id="learn" className={cn(container, pad, "grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16")}>
      <div className="flex flex-col gap-5">
        <Eyebrow>Roadmaps and tutorials</Eyebrow>
        <h2 className={h2}>Follow a roadmap from your first loop to interview-ready</h2>
        <p className="max-w-[520px] text-base leading-[25px] text-text-secondary">
          Each step is a short lesson followed by real problems from the library. Your progress is saved on every
          lesson, and every lesson earns XP.
        </p>
        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex items-baseline gap-2.5">
            <Tag>FREE</Tag>
            <span>
              <b className="font-medium">Tutorials:</b> short lessons like &ldquo;Two pointers&rdquo; or &ldquo;Hash maps
              and sets&rdquo;, each with practice problems.
            </span>
          </li>
          <li className="flex items-baseline gap-2.5">
            <Tag pro>PRO</Tag>
            <span>
              <b className="font-medium">Roadmaps:</b> guided paths of lessons and problems. The first module of each is
              free.
            </span>
          </li>
          <li className="flex items-baseline gap-2.5">
            <Tag>FREE</Tag>
            <span>
              <b className="font-medium">Every exercise</b> stays free in the problem library, in every language.
            </span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/learn">Browse tutorials</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/learn">See all roadmaps</Link>
          </Button>
        </div>
      </div>

      <WindowCard file="roadmap.exe" color="purple" bodyClassName="gap-4.5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <Eyebrow>Roadmap</Eyebrow>
            <span className="text-lg font-medium">Data structures and algorithms</span>
          </div>
          <span className="font-mono text-xs text-text-secondary">1 OF 5 MODULES · 260 XP EARNED</span>
        </div>
        <div className="h-1.5 rounded-[3px] bg-bg-tertiary">
          <div className="h-1.5 w-[20%] rounded-[3px] bg-brand" />
        </div>
        <ol className="grid gap-2.5 sm:grid-cols-2">
          {DSA.map(([name, state, lessons], i) => (
            <li
              key={name}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] border bg-card px-3 py-2.5",
                state === "now" && "border-duel-you",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] text-muted-foreground",
                  state === "done" && "border-foreground bg-foreground text-background",
                  state === "now" && "border-duel-you bg-duel-you text-white",
                )}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className="text-[13px] font-medium">{name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {state === "done" ? "DONE · " : state === "now" ? "IN PROGRESS · " : ""}
                  {lessons} LESSONS
                </span>
              </span>
              {i > 0 && <Tag pro>PRO</Tag>}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3.5">
          <Eyebrow className="mr-1 text-[10px]">Other roadmaps</Eyebrow>
          <span className="rounded-sm bg-bg-secondary px-2.5 py-1 text-xs">Programming basics</span>
          <span className="rounded-sm bg-bg-secondary px-2.5 py-1 text-xs">Interview prep</span>
        </div>
      </WindowCard>
    </section>
  );
}

export function ResearchAndCoach() {
  return (
    <section className={cn(container, "grid gap-8 pb-16 sm:pb-24 lg:grid-cols-2")}>
      <WindowCard file="research.exe" color="blue" bodyClassName="gap-5 p-6 sm:p-8">
        <Eyebrow>Research panel</Eyebrow>
        <h3 className="text-[28px] leading-8">Look things up without leaving the problem</h3>
        <p className="text-[15px] leading-[23px] text-text-secondary">
          Official docs for each language, pinned to the version the judge runs. Every page you open is logged, so
          research is allowed and rankings stay honest.
        </p>
        <div className={cn(card, "flex flex-col gap-3 p-4")}>
          <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-[13px]">
            <Search className="size-3.5 text-muted-foreground" aria-hidden />
            <span>sort key lambda</span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">Python 3.14</span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {[
              ["Sorting Techniques", "python › howto › sorting"],
              ["sorted(iterable, /, *, key=None, reverse=False)", "python › library › functions"],
              ["list.sort(*, key=None, reverse=False)", "python › library › stdtypes"],
            ].map(([title, path], i) => (
              <li key={path} className={cn("rounded-[8px] px-3 py-2.5", i === 0 && "bg-bg-secondary")}>
                <div className="truncate text-[13px] font-medium">{title}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{path}</div>
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-3 font-mono text-[11px] text-muted-foreground">
            <span>RANKED 1V1: OFFICIAL DOCS ONLY</span>
            <span>2 pages opened</span>
          </div>
        </div>
      </WindowCard>

      <WindowCard file="coach.exe" color="green" bodyClassName="gap-5 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Eyebrow>AI coach</Eyebrow>
          <Tag>COMING SOON</Tag>
        </div>
        <h3 className="text-[28px] leading-8">A coach that asks instead of answering</h3>
        <p className="text-[15px] leading-[23px] text-text-secondary">
          Hints nudge you toward the idea and point to the exact doc section. No full solutions, ever. It joins Pro
          after launch.
        </p>
        <div className={cn(card, "flex flex-col gap-3 p-4 text-[13px] leading-[19px]")}>
          {[
            ["COACH", "Your loop compares every pair of intervals. After sorting by start, which interval do you actually need to compare against?"],
            ["YOU", "Only the last one I merged."],
            ["COACH", "Exactly. Check how key= works in the sorting guide, then try it."],
          ].map(([who, text], i) => (
            <div key={i} className="flex gap-2.5">
              <span className="w-11 shrink-0 font-mono text-[11px] text-muted-foreground">{who}</span>
              <span className={cn(who === "YOU" && "text-text-secondary")}>{text}</span>
            </div>
          ))}
          <div className="border-t pt-2.5 font-mono text-[11px] text-muted-foreground">
            A FEW HINTS A DAY FREE · UNLIMITED WITH PRO
          </div>
        </div>
      </WindowCard>
    </section>
  );
}

// weekly/beyond-the-grid, with the real points per difficulty (convex/lib/weekly.ts).
const WEEKLY = [
  ["Connected Components", "EASY", 100, true],
  ["Fewest Terms", "MEDIUM", 200, true],
  ["Signal Time", "MEDIUM", 200, true],
  ["Critical Links", "HARD", 400, false],
] as const;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function Challenges() {
  return (
    <section id="challenges" className={cn(muted, pad, "scroll-mt-16")}>
      <div className={cn(container, "flex flex-col gap-10")}>
        <SectionHead
          label="Daily and weekly challenges"
          title="A reason to come back every day"
          aside="Free for everyone, with their own points and leaderboards. They never change your match ratings."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <WindowCard file="daily_challenge.exe" color="orange" bodyClassName="gap-4.5 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Daily challenge</Eyebrow>
              <DailyCountdown />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[22px] font-medium tracking-tight">Rotate Image</span>
              <span className="font-mono text-xs text-muted-foreground">MEDIUM · SAME PROBLEM FOR EVERYONE TODAY</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm">
                  <b className="font-mono text-2xl font-medium">12</b> day streak
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">1 STREAK FREEZE HELD</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className={cn("h-7 w-full rounded-sm border", i < 6 ? "border-foreground bg-foreground" : "border-border-strong")} />
                    <span className="font-mono text-[10px] text-muted-foreground">{day}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/daily">Solve today&apos;s challenge</Link>
              </Button>
              <span className="font-mono text-xs text-brand-text">+80 XP WITH YOUR STREAK</span>
            </div>
          </WindowCard>

          <WindowCard file="weekly_challenge.exe" color="yellow" bodyClassName="gap-4 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Weekly challenge · Beyond the Grid</Eyebrow>
              <span className="font-mono text-xs">ENDS SUNDAY</span>
            </div>
            <ul className="flex flex-col">
              {WEEKLY.map(([name, diff, pts, done]) => (
                <li key={name} className="flex h-[38px] items-center gap-2.5 border-b text-[13px]">
                  <span
                    className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center rounded-full",
                      done ? "bg-verdict-ac text-white dark:text-background" : "bg-bg-tertiary",
                    )}
                  >
                    {done && <span className="text-[10px]" aria-label="Solved">✓</span>}
                  </span>
                  <span className="grow font-medium">{name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{diff}</span>
                  <span className="w-16 text-right font-mono text-xs tabular-nums">{pts} pts</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                Your score <b className="font-mono font-medium">500 / 900</b>
              </span>
              <span className="font-mono text-xs text-muted-foreground">TOP 10% EARNS A BADGE</span>
            </div>
            <Button size="lg" variant="secondary" className="self-start" asChild>
              <Link href="/weekly">See this week&apos;s set</Link>
            </Button>
          </WindowCard>
        </div>
      </div>
    </section>
  );
}

const BADGES: [name: string, rare: string, icon: LucideIcon, held: boolean][] = [
  ["First solve", "61% OF PLAYERS", Code, true],
  ["30-day streak", "8% OF PLAYERS", Flame, true],
  ["Core holder", "4% OF PLAYERS", Hexagon, true],
  ["Weekly top 10%", "3% OF PLAYERS", Trophy, true],
  ["Algorithmist", "LOCKED · 2%", GraduationCap, false],
  ["Ninjathon winner", "LOCKED · 0.4%", Star, false],
];

export function Progression() {
  return (
    <section id="progression" className={cn("border-t", pad)}>
      <div className={cn(container, "flex flex-col gap-10")}>
        <SectionHead
          label="Levels, titles and badges"
          title="Everything you do earns XP"
          aside="XP measures effort and only goes up. Ratings measure skill. The two never mix, so no amount of grinding buys a better rating."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <LevelDemo />
          <div className="flex min-w-0 flex-col gap-6">
            <WindowCard file="titles.exe" color="purple" bodyClassName="gap-3 p-6">
              <Eyebrow>Titles</Eyebrow>
              <TitleBands />
            </WindowCard>
            <WindowCard file="badges.exe" color="pink" bodyClassName="gap-3 p-6">
              <div className="flex flex-wrap justify-between gap-2">
                <Eyebrow>Badges</Eyebrow>
                <span className="font-mono text-[11px] text-muted-foreground">% = PLAYERS WHO HOLD IT</span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {BADGES.map(([name, rare, Icon, held]) => (
                  <li key={name} className={cn("flex items-center gap-2.5 rounded-[10px] border p-2.5", !held && "opacity-50")}>
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-bg-secondary">
                      <Icon className="size-[15px]" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs font-medium">{name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{rare}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </WindowCard>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Leaderboards() {
  return (
    <section id="leaderboards" className={cn(muted, pad, "scroll-mt-16")}>
      <div className={cn(container, "flex flex-col gap-8")}>
        <div className="flex flex-col gap-3">
          <Eyebrow>Leaderboards</Eyebrow>
          <h2 className={h2}>A leaderboard for every way to win</h2>
          <p className="max-w-[640px] text-base leading-[25px] text-text-secondary">
            Each area keeps its own points, so a patient learner and a fast duelist can both reach the top of
            something. Every board works globally, by country and inside your group.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <LeaderboardDemo />
          <WindowCard file="my_group.exe" color="green" bodyClassName="gap-4 p-6 sm:p-7">
            <Eyebrow>For teams and offices</Eyebrow>
            <span className="text-[22px] leading-7 font-medium tracking-tight">Bring your team. Settle it on the map.</span>
            <p className="text-sm leading-[21px] text-text-secondary">
              Create a free group, share the invite code, and your team gets its own leaderboards and one-click
              Territory lobbies. A good Friday afternoon.
            </p>
            <div className="flex items-center gap-2.5 rounded-[10px] bg-bg-secondary px-3.5 py-3">
              <span className="font-mono text-[11px] text-muted-foreground">INVITE CODE</span>
              <span className="font-mono text-base font-medium tracking-[0.08em]">7Q4KX2MP</span>
              <CopyCode code="7Q4KX2MP" />
            </div>
            <ol className="flex flex-col gap-2 text-[13px]">
              {[
                "Group leaderboards for every area",
                "Start a Territory lobby from the group page",
                "Up to 100 members, free and private",
              ].map((text, i) => (
                <li key={text} className="flex gap-2">
                  <span className="w-4 font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {text}
                </li>
              ))}
            </ol>
            <Button size="lg" className="mt-auto self-start" asChild>
              <Link href="/groups">Create a group</Link>
            </Button>
          </WindowCard>
        </div>
      </div>
    </section>
  );
}

export function Profiles() {
  return (
    <section id="profiles" className={cn(container, pad, "grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16")}>
      <div className="flex flex-col gap-5">
        <Eyebrow>Profiles and sharing</Eyebrow>
        <h2 className={h2}>A profile worth putting on your CV</h2>
        <p className="max-w-[520px] text-base leading-[25px] text-text-secondary">
          Your ratings, level, badges and best solutions on one public page. Stats are always drawn by the platform,
          so a 1642 means the same thing on every profile.
        </p>
        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex items-baseline gap-2.5">
            <Tag>FREE</Tag>
            <span>Default profile, free themes and themes you earn by leveling up.</span>
          </li>
          <li className="flex items-baseline gap-2.5">
            <Tag pro>PRO</Tag>
            <span>Every theme, your accent colour, banner, heading font, section order and a short URL.</span>
          </li>
          <li className="flex items-baseline gap-2.5">
            <Tag>FREE</Tag>
            <span>A share card for every 1v1 result, and challenge links anyone can open.</span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">Make your profile</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/pro">What Pro adds</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileCard theme="default" />
        <ProfileCard theme="terminal" />
        <div className="flex flex-col gap-4 rounded-md bg-[#0a0a0a] p-5 text-[#fafafa] sm:col-span-2 sm:flex-row sm:items-center sm:px-6 dark:border">
          <span className="flex grow flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-[#a1a1a1]">SHARE CARD · 1200 × 630</span>
            <span className="text-[22px] leading-7 tracking-tight">
              I beat @kiri_dev in 6:41 on &ldquo;Merge Intervals&rdquo;.
            </span>
            <span className="font-mono text-xs text-[#a1a1a1]">1V1 RACE · +16 · 1658 EXPERT · NINJATHONS.COM/M/…</span>
          </span>
          <span className="flex shrink-0 flex-col gap-1.5">
            <span className="font-mono text-[10px] text-[#a1a1a1]">POST TO</span>
            <span className="text-[13px]">X · LinkedIn · Discord</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function ProfileCard({ theme }: { theme: "default" | "terminal" }) {
  const terminal = theme === "terminal";
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-md border", terminal ? "border-[#1f2d22] bg-[#0b0f0c]" : "bg-card")}>
      <div
        className="h-16"
        style={
          terminal
            ? { backgroundColor: "#0f1a12", backgroundImage: "repeating-linear-gradient(0deg, #1f3a26 0 1px, transparent 1px 6px)" }
            : {
                backgroundColor: "var(--bg-secondary)",
                backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }
        }
      />
      <div className="flex flex-col gap-2.5 px-4.5 pb-4.5">
        <span
          className={cn(
            "-mt-[26px] flex size-[52px] items-center justify-center rounded-full border-[3px] bg-[#e5e5e5] text-base font-medium text-[#0a0a0a]",
            terminal ? "border-[#0b0f0c]" : "border-card",
          )}
        >
          DI
        </span>
        <span className="flex flex-col">
          <span className={cn("text-base font-medium", terminal && "font-mono text-[#d1fae5]")}>{terminal ? "daniel" : "Daniel"}</span>
          <span className={cn("font-mono text-[11px]", terminal ? "text-[#86efac]" : "text-muted-foreground")}>LV 14 · DEBUGGER · DK</span>
        </span>
        <div className={cn("grid grid-cols-2 gap-1.5", terminal && "rounded-[8px] bg-white p-1.5 text-[#0a0a0a]")}>
          {[
            ["1V1", "1642"],
            ["TERRITORY", "1588"],
          ].map(([label, value]) => (
            <div key={label} className={cn("rounded-[8px] p-2", !terminal && "bg-bg-secondary")}>
              <div className={cn("font-mono text-[9px]", terminal ? "text-[#6b6b6b]" : "text-muted-foreground")}>{label}</div>
              <div className="font-mono text-base font-medium">{value}</div>
            </div>
          ))}
        </div>
        <span className={cn("font-mono text-[10px]", terminal ? "text-[#86efac]" : "text-muted-foreground")}>
          {terminal ? "TERMINAL THEME · PRO" : "DEFAULT THEME · FREE"}
        </span>
      </div>
    </div>
  );
}

export function Ninjathons() {
  return (
    <section className={cn("border-t", pad)}>
      <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2 lg:gap-16")}>
        <div className="flex flex-col gap-5">
          <Eyebrow>Ninjathons</Eyebrow>
          <h2 className={h2}>Hackathons for developers, run properly</h2>
          <p className="max-w-[520px] text-base leading-[25px] text-text-secondary">
            Teams, deadlines, judges and rankings in one place. We run the events, anyone can join for free, and every
            project handed in earns XP and badges. Private ninjathons for Pro members are coming next.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/ninjathons">Browse ninjathons</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/leaderboards">Hall of fame</Link>
            </Button>
          </div>
        </div>
        <WindowCard file="ninjathon.exe" color="blue" bodyClassName="gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Example ninjathon</Eyebrow>
            <span className="rounded-xs border border-verdict-ac/30 bg-verdict-ac/10 px-[7px] py-0.5 font-mono text-[11px] text-verdict-ac">
              FREE ENTRY
            </span>
          </div>
          <div className="text-[22px] font-medium tracking-tight">Build a rate limiter that survives a flash sale</div>
          <div className="text-[13px] text-text-secondary">
            Teams of 1 to 4 · Judged on correctness, latency and code quality · +200 XP for handing in
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["STARTS", "Sat · 10:00"],
              ["DURATION", "48 h"],
              ["1ST PLACE", "+1,000 XP"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[10px] bg-bg-secondary p-3">
                <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
                <div className="font-mono text-sm font-medium">{value}</div>
              </div>
            ))}
          </div>
          <Button size="lg" className="self-start" asChild>
            <Link href="/ninjathons">Register a team</Link>
          </Button>
        </WindowCard>
      </div>
    </section>
  );
}

export function Pricing({ proPrice }: { proPrice: string | null }) {
  return (
    <section className={cn(muted, "border-b-0", pad)}>
      <div className={cn(container, "flex flex-col gap-10")}>
        <SectionHead
          label="Pricing"
          title="Competing is free. Roadmaps and custom profiles are Pro."
          action={
            <Button size="lg" variant="secondary" className="self-start md:self-auto" asChild>
              <Link href="/pro">Compare plans</Link>
            </Button>
          }
        />
        <div className="grid gap-6 md:grid-cols-3">
          <PlanCard
            name="Free"
            file="free.exe"
            color="green"
            price="€0"
            per="forever"
            items={[
              "Every exercise, every language",
              "1v1 and Territory, ranked and unranked",
              "Daily and weekly challenges, ninjathons",
              "XP, levels, badges, every leaderboard",
              "Tutorials, default profile, groups",
            ]}
            action={
              <Button size="lg" variant="secondary" asChild>
                <Link href="/sign-up">Start free</Link>
              </Button>
            }
          />
          <PlanCard
            name="Pro"
            tag={<Tag pro>PRO</Tag>}
            price={proPrice ?? "Pro"}
            per={proPrice ? "/ month" : ""}
            file="pro.exe"
            color="pink"
            items={[
              "Every roadmap module",
              "Custom profile, all 10 themes, short URL",
              "Pro badge on your profile",
              "Coming soon: unlimited AI coach",
              "Coming soon: match replays",
            ]}
            action={
              <Button size="lg" variant="pro" asChild>
                <Link href="/pro">Go Pro</Link>
              </Button>
            }
          />
          <PlanCard
            name="Organization"
            file="organization.exe"
            color="blue"
            tag={<Tag>COMING LATER</Tag>}
            price="Custom"
            per="per event or seat"
            items={[
              "Public, branded ninjathons",
              "Hiring challenges and candidate reports",
              "Classes, assignments, class leaderboards",
              "Similarity checks",
            ]}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">NEVER PAID: RATING, RANKED GAMES, LEADERBOARD PLACEMENT.</span>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  tag,
  price,
  per,
  items,
  action,
  file,
  color,
}: {
  name: string;
  tag?: ReactNode;
  price: string;
  per: string;
  items: string[];
  action?: ReactNode;
  file: string;
  color: WinColor;
}) {
  return (
    <WindowCard file={file} color={color} bodyClassName="gap-4 p-6 sm:p-7">
      <div className="flex justify-between">
        <span className="text-base font-medium">{name}</span>
        {tag}
      </div>
      <div>
        <span className="font-mono text-4xl font-medium tabular-nums">{price}</span>
        <span className="text-[13px] text-muted-foreground"> {per}</span>
      </div>
      <ul className="flex flex-col gap-2 text-sm text-text-secondary">
        {items.map((item) => (
          <li key={item} className={cn(item.startsWith("Coming") && "text-muted-foreground")}>
            {item}
          </li>
        ))}
      </ul>
      {action && <div className="mt-auto flex pt-2 [&>*]:w-full">{action}</div>}
    </WindowCard>
  );
}

export function FinalCta() {
  return (
    <section className={cn("border-t", pad)}>
      <div className={cn(container, "flex flex-col items-start gap-6")}>
        <h2 className="max-w-[760px] text-[32px] leading-[1.1] sm:text-5xl sm:leading-[53px]">
          Your first problem takes a few minutes. Your first match, one click.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">Start free</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/problems">Browse problems</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
