"use client";

import { Press_Start_2P, Titan_One } from "next/font/google";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import s from "./retro.module.css";

const arcadeFont = Press_Start_2P({ weight: "400", subsets: ["latin"] });
const displayFont = Titan_One({ weight: "400", subsets: ["latin"] });

const LOOP = [
  { glyph: "</>", name: "SOLVE", bg: "#ff7a00", fg: "#ffffff" },
  { glyph: "+XP", name: "EARN", bg: "#ffe600", fg: "#0a0a0a" },
  { glyph: "▲", name: "LEVEL", bg: "#12c98a", fg: "#0a0a0a" },
  { glyph: "★", name: "UNLOCK", bg: "#ff1f8f", fg: "#ffffff" },
  { glyph: "VS", name: "DUEL", bg: "#a12cf0", fg: "#ffffff" },
];

// Starting values from convex/lib/xp.ts, learn.ts, matches, territory.ts and
// daily.ts (decisions §13 to §19).
const SCORING = [
  ["EASY PROBLEM", "10 XP"],
  ["MEDIUM PROBLEM", "20 XP"],
  ["HARD PROBLEM", "40 XP"],
  ["LESSON DONE", "15 XP"],
  ["RANKED 1V1 WIN", "25 XP"],
  ["TERRITORY 1ST", "40 XP"],
  ["DAILY + STREAK", "UP TO 80 XP"],
  ["NINJATHON ENTRY", "200 XP"],
];

const WINDOWS = [
  {
    file: "level.exe",
    color: "#ff7a00",
    title: "Every problem is a level",
    text: "Every first solve pays XP, and harder problems pay more. The daily challenge keeps a streak going, so there's always a reason to come back.",
    chip: "LV 14 → LV 15",
  },
  {
    file: "fair_play.exe",
    color: "#2233ff",
    title: "Skill can't be bought",
    text: "XP measures effort and ratings measure skill. They never mix. Pro unlocks roadmaps and profile looks, never rating, XP or badges.",
    chip: "PRO ≠ PAY TO WIN",
  },
  {
    file: "rivals.exe",
    color: "#ff1f8f",
    title: "Rivals, not strangers",
    text: "Challenge anyone by username or with a link, race a ghost when nobody's online, and compare with your group on every board.",
    chip: "KIRI_DEV SENT A CHALLENGE",
  },
  {
    file: "quick_match.exe",
    color: "#12c98a",
    barText: "#0a0a0a",
    numColor: "#0b8f62",
    title: "Short games, real skills",
    text: "A 1v1 race lasts 15 to 40 minutes and Territory at most 30. Every round is a real problem, the kind you'll meet in interviews and on the job.",
    chip: "15–40 MIN · 30 MIN",
  },
  {
    file: "trophies.exe",
    color: "#a12cf0",
    title: "Rewards worth showing off",
    text: "Badges show how rare they are, titles run from Initiate to Legend, and profile themes unlock as you level up. Any 1v1 result becomes a share card.",
    chip: "CORE HOLDER",
  },
  {
    file: "no_tricks.exe",
    color: "#ff2d2d",
    shadow: "#ffe600",
    title: "Fun without dark patterns",
    text: "No loot boxes, no endless feed and no guilt trips. A session ends when the problem is solved, and a streak freeze covers a missed day.",
    chip: "BUILT TO MAKE YOU BETTER, NOT HOOKED",
  },
];

/**
 * "The web lost its colors": starts gray and fades into colour after a moment,
 * with a button to switch it back and forth. Reduced motion skips the wait.
 */
export function ColorsSection() {
  const [colors, setColors] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setColors(true), reduce ? 0 : 2500);
    return () => clearTimeout(timer);
  }, []);

  const arcade = cn(arcadeFont.className, s.arcade);

  return (
    <section className="border-t">
      <div className="mx-auto flex max-w-[84rem] flex-col gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end md:gap-10">
          <div className="flex max-w-[800px] flex-col gap-3.5">
            <span className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Our approach to fun
            </span>
            <h2 className="text-[32px] leading-[1.1] sm:text-5xl">The web lost its colors. We&apos;re bringing them back.</h2>
            <p className="text-[17px] leading-[27px] text-text-secondary">
              Coding practice got gray: endless lists, silent grinding, nobody to play against. We think getting better
              should feel like a game you want to come back to, without the tricks that make games bad for you.
            </p>
          </div>
          <Button
            size="lg"
            className="h-11 shrink-0 self-start px-5 md:self-auto"
            aria-pressed={colors}
            onClick={() => setColors((on) => !on)}
          >
            {colors ? "Take the colors away" : "Bring the colors back"}
          </Button>
        </div>

        <div className={cn(s.fun, !colors && s.gray, "flex flex-col gap-6")}>
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <div className={s.loop}>
              <span className={arcade} style={{ color: "#ffe600", fontSize: 14 }}>
                THE GAME LOOP
              </span>
              <span className="max-w-[560px] text-[15px] leading-[23px] text-[#e6e8ff]">
                Every session runs through the same loop. It&apos;s short enough to fit in a lunch break, and it always
                ends with something new: a level, a badge or a rematch.
              </span>
              <div className="relative pb-[46px]">
                <ol className="relative z-[1] grid grid-cols-2 gap-[22px] sm:grid-cols-5">
                  {LOOP.map((node, i) => (
                    <li key={node.name} className={s.node} style={{ background: node.bg, color: node.fg }}>
                      <span className={cn(displayFont.className, s.glyph)} aria-hidden>
                        {node.glyph}
                      </span>
                      <span className={arcade}>{node.name}</span>
                      {i < LOOP.length - 1 && (
                        <span className={cn(s.arrow, "hidden sm:block")} aria-hidden>
                          ▶
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
                <svg
                  width="100%"
                  height="44"
                  viewBox="0 0 700 44"
                  preserveAspectRatio="none"
                  aria-hidden
                  className="absolute bottom-0 left-0 hidden sm:block"
                >
                  <path
                    d="M630 0 V26 H70 V6"
                    fill="none"
                    stroke="#ffe600"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path d="M62 12 L70 0 L78 12 Z" fill="#ffe600" />
                </svg>
                <span
                  className={cn(arcade, "absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#2233ff] px-2.5")}
                  style={{ color: "#ffe600", fontSize: 10 }}
                >
                  PLAY AGAIN
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <span className={s.toast}>
                  <b className={arcadeFont.className}>+40 XP</b> Hard problem, first solve
                </span>
                <span className={s.toast}>
                  <b className={arcadeFont.className}>LV 15</b> You&apos;re a Builder now
                </span>
                <span className={s.toast}>
                  <b className={arcadeFont.className}>NEW</b> Badge: 7-day streak
                </span>
              </div>
            </div>

            <div className={s.score}>
              <div className="flex items-center justify-between">
                <span className={cn(arcade, s.neon)} style={{ fontSize: 15 }}>
                  HOW TO SCORE
                </span>
                <span className={cn(arcade, s.blink)} style={{ fontSize: 9, color: "#4dffc3" }} aria-hidden>
                  1UP
                </span>
              </div>
              <ul className="flex flex-col gap-4">
                {SCORING.map(([what, xp]) => (
                  <li key={what} className={cn(arcadeFont.className, s.row)}>
                    <span>{what}</span>
                    <i aria-hidden />
                    <b>{xp}</b>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-[#3a44ff] pt-3.5">
                <span className={arcade} style={{ fontSize: 9, lineHeight: "16px", color: "#ffe600" }}>
                  INSERT COIN? NEVER.
                  <br />
                  XP CAN&apos;T BE BOUGHT.
                </span>
                <span className={cn(arcade, s.blink)} style={{ fontSize: 10, color: "#ff1f8f" }} aria-hidden>
                  PRESS START
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {WINDOWS.map((w, i) => (
              <div key={w.file} className={s.win} style={{ boxShadow: `6px 6px 0 ${w.shadow ?? w.color}` }}>
                <div className={s.bar} style={{ background: w.color, color: w.barText ?? "#ffffff" }}>
                  <span>{w.file}</span>
                  <span className={s.controls} aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className={s.body}>
                  <span className={cn(displayFont.className, s.num)} style={{ color: w.numColor ?? w.color }} aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={s.heading}>{w.title}</h3>
                  <p className={s.text}>{w.text}</p>
                  <span className={cn(arcadeFont.className, s.chip)}>{w.chip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <span className="font-mono text-xs text-muted-foreground">
          XP, LEVELS, TITLES, BADGES, STREAKS, DAILY AND WEEKLY CHALLENGES ALL SHIP IN V1.
        </span>
      </div>
    </section>
  );
}
