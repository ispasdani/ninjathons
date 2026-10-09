"use client";

import { type Preloaded, useConvexAuth, usePreloadedQuery } from "convex/react";
import { Check, Lock } from "lucide-react";
import Link from "next/link";

import { LessonState } from "@/components/learn/lesson-state";
import { LessonText } from "@/components/learn/lesson-text";
import { Button } from "@/components/ui/button";
import type { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";


/**
 * A roadmap as a path (decisions §17): its modules in order down a line, each
 * a node that fills in once finished, with its lessons and your progress.
 */
export function RoadmapPage({ preloaded }: { preloaded: Preloaded<typeof api.learn.roadmap> }) {
  const roadmap = usePreloadedQuery(preloaded);
  const { isAuthenticated } = useConvexAuth();
  if (!roadmap) return null;

  const lessons = roadmap.modules.flatMap((m) => m.lessons);
  const done = lessons.filter((l) => l.state === "finished").length;
  // Where to carry on: the first lesson not yet finished.
  const next = lessons.find((l) => l.state !== "finished");

  return (
    <div className="max-w-4xl">
      <nav className="font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/learn" className="hover:text-foreground">
          LEARN
        </Link>{" "}
        / ROADMAP
      </nav>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl text-balance sm:text-4xl">{roadmap.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{roadmap.summary}</p>
        </div>
        {isAuthenticated && next && (
          <Button variant="brand" asChild>
            <Link href={`/learn/${next.slug}?roadmap=${roadmap.slug}`}>
              {done === 0 ? "Start" : "Carry on"}: {next.title}
            </Link>
          </Button>
        )}
      </header>

      {isAuthenticated && (
        <div className="mt-6 max-w-md">
          <div className="flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span>
              {done} / {lessons.length} lessons
            </span>
            <span>{roadmap.modules.filter((m) => m.finished).length} / {roadmap.modules.length} modules</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary">
            <div className="h-full bg-brand" style={{ width: `${lessons.length ? (done / lessons.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <LessonText>{roadmap.intro}</LessonText>
      </div>

      <ol className="relative mt-10" aria-label="Modules">
        {roadmap.modules.map((module, i) => {
          const last = i === roadmap.modules.length - 1;
          return (
            <li key={module.slug} className="relative flex gap-5 pb-10 last:pb-0">
              {/* The path: a line from this node down to the next. */}
              {!last && (
                <span
                  aria-hidden
                  className={cn("absolute top-9 bottom-0 left-[17px] w-px", module.finished ? "bg-brand" : "bg-border")}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-[13px] tabular-nums",
                  module.finished ? "border-transparent bg-brand text-brand-foreground" : "bg-background",
                )}
                aria-label={module.finished ? `Module ${i + 1}, finished` : `Module ${i + 1}`}
              >
                {module.finished ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <section className="min-w-0 flex-1 rounded-md border p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl">{module.title}</h2>
                  {module.free ? (
                    <span className="rounded-sm bg-bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      Free preview
                    </span>
                  ) : (
                    <span className="rounded-xs border border-pro-border bg-pro px-1.5 font-mono text-[10px] font-medium tracking-[0.08em] text-pro-foreground uppercase">
                      Pro
                    </span>
                  )}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">+{roadmap.xp.module} XP</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{module.summary}</p>
                {module.lessons.some((l) => l.locked) && (
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Its lessons are part of{" "}
                    <Link href="/pro" className="text-brand-text hover:underline">
                      Pro
                    </Link>
                    ; tutorials and every exercise stay free.
                  </p>
                )}
                <ul className="mt-4 divide-y border-t">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.slug}>
                      <Link
                        href={`/learn/${lesson.slug}?roadmap=${roadmap.slug}`}
                        className="group flex items-center gap-3 py-3 text-[13px] transition-colors hover:text-foreground"
                      >
                        {lesson.locked ? (
                          <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Pro lesson" />
                        ) : (
                          <LessonState state={lesson.state} />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{lesson.title}</span>
                          {lesson.tutorial && <span className="ml-2 text-xs text-muted-foreground">Tutorial</span>}
                          <span className="mt-0.5 block truncate text-muted-foreground">{lesson.summary}</span>
                        </span>
                        <span className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:inline">
                          {lesson.exercises} {lesson.exercises === 1 ? "exercise" : "exercises"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
