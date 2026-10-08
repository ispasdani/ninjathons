"use client";

import { type Preloaded, useConvexAuth, usePreloadedQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LessonState } from "@/components/learn/lesson-state";
import type { api } from "@/convex/_generated/api";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

/**
 * The Learn page (decisions §17): the roadmaps with how far you've got, then
 * every tutorial. Public; signed in, the progress is yours.
 */
export function LearnHome({ preloaded }: { preloaded: Preloaded<typeof api.learn.overview> }) {
  const { roadmaps, tutorials, xp } = usePreloadedQuery(preloaded);
  const { isAuthenticated } = useConvexAuth();

  return (
    <div>
      <header className="max-w-3xl">
        <p className={eyebrow}>Learn</p>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Learn by solving</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
          Short lessons that each end in real problems from the library. A lesson is finished when you&apos;ve read it
          and solved its exercises: {xp.lesson} XP for each, {xp.module} more for each roadmap module.
          {!isAuthenticated && " Sign in to keep your progress."}
        </p>
      </header>

      <section className="mt-10" aria-labelledby="roadmaps">
        <h2 id="roadmaps" className={eyebrow}>
          Roadmaps
        </h2>
        {roadmaps.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No roadmaps yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {roadmaps.map((roadmap) => {
              const share = roadmap.lessons ? roadmap.finished / roadmap.lessons : 0;
              return (
                <li key={roadmap.slug}>
                  <Link
                    href={`/roadmaps/${roadmap.slug}`}
                    className="flex h-full flex-col rounded-md border p-6 transition-colors hover:border-border-strong"
                  >
                    <p className="text-xl">{roadmap.title}</p>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{roadmap.summary}</p>
                    <p className="mt-5 font-mono text-xs text-muted-foreground tabular-nums">
                      {roadmap.modules} modules · {roadmap.lessons} lessons
                      {isAuthenticated && ` · ${roadmap.finished} done`}
                    </p>
                    {isAuthenticated && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-bg-tertiary">
                        <div className="h-full bg-brand" style={{ width: `${share * 100}%` }} />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="tutorials">
        <h2 id="tutorials" className={eyebrow}>
          Tutorials · free
        </h2>
        {tutorials.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No tutorials yet.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-md border">
            {tutorials.map((tutorial) => (
              <li key={tutorial.slug}>
                <Link
                  href={`/learn/${tutorial.slug}`}
                  className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-bg-secondary"
                >
                  <LessonState state={tutorial.state} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{tutorial.title}</p>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{tutorial.summary}</p>
                  </div>
                  <span className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:inline">
                    {tutorial.exercises} {tutorial.exercises === 1 ? "exercise" : "exercises"}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
