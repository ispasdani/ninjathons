"use client";

import { type Preloaded, useConvexAuth, useMutation, usePreloadedQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LessonText } from "@/components/learn/lesson-text";
import { Difficulty } from "@/components/problem/difficulty";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase";

type Opened = { xp: number; modules: { title: string }[] };

/**
 * A lesson or tutorial (decisions §17): the text, then its exercises. Opening
 * it signed in counts as reading it; it's finished once every exercise is
 * solved, earlier solves included.
 */
export function LessonPage({ preloaded }: { preloaded: Preloaded<typeof api.learn.lesson> }) {
  const lesson = usePreloadedQuery(preloaded);
  const { isAuthenticated } = useConvexAuth();
  const open = useMutation(api.learn.open);
  const [opened, setOpened] = useState<Opened | null>(null);
  const sent = useRef<string | null>(null);

  const slug = lesson?.slug;
  useEffect(() => {
    if (!isAuthenticated || !slug || sent.current === slug) return;
    sent.current = slug;
    open({ slug }).then(setOpened, () => {
      sent.current = null;
    });
  }, [isAuthenticated, slug, open]);

  if (!lesson) return null;
  const { place, exercises, me } = lesson;
  const solved = exercises.filter((e) => e.solved).length;
  const finished = me?.finishedAt != null;

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/learn" className="hover:text-foreground">
          LEARN
        </Link>
        <span aria-hidden>/</span>
        {place ? (
          <>
            <Link href={`/roadmaps/${place.roadmap.slug}`} className="uppercase hover:text-foreground">
              {place.roadmap.title}
            </Link>
            <span aria-hidden>/</span>
            <span className="uppercase">
              {place.module.title} · {place.position} of {place.of}
            </span>
          </>
        ) : (
          <span>TUTORIAL</span>
        )}
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl text-balance sm:text-4xl">{lesson.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{lesson.summary}</p>
      </header>

      <div className="mt-8">
        <LessonText>{lesson.body}</LessonText>
      </div>

      <section
        aria-labelledby="practice"
        className={cn("mt-12 rounded-md border p-6", finished && "shadow-[inset_2px_0_0_var(--brand)]")}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="practice" className={eyebrow}>
            Practice
          </h2>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {solved} / {exercises.length} solved
          </p>
        </div>
        <ol className="mt-4 divide-y border-y">
          {exercises.map((exercise, i) => (
            <li key={exercise.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:flex-nowrap">
              <span className="w-5 font-mono text-[13px] text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{exercise.title}</p>
                <p className="mt-0.5 text-[13px]">
                  <Difficulty level={exercise.difficulty} />
                </p>
              </div>
              {exercise.solved && <Check className="size-4 text-brand-text" aria-label="Solved" />}
              {isAuthenticated && (
                <Button variant={exercise.solved ? "outline" : "default"} size="sm" asChild>
                  <Link href={`/solve/${exercise.slug}`}>{exercise.solved ? "Open" : "Solve"}</Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-muted-foreground" role="status">
          {!isAuthenticated ? (
            <>
              <Link href="/sign-in" className="text-brand-text hover:underline">
                Sign in
              </Link>{" "}
              to solve these and keep your progress. Finishing a lesson gives {lesson.xp} XP.
            </>
          ) : finished ? (
            <>
              <span className="font-medium text-foreground">Lesson finished.</span>
              {opened && opened.xp > 0 && ` +${opened.xp} XP`}
              {opened?.modules.map((m) => ` Module finished: ${m.title}.`)}
            </>
          ) : (
            `Solve every exercise, in any language, to finish the lesson: ${lesson.xp} XP. Problems you've already solved count.`
          )}
        </p>
      </section>

      {place && (
        <nav className="mt-8 flex flex-wrap justify-between gap-3" aria-label="Lessons">
          {place.previous ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/learn/${place.previous.slug}`}>
                <ArrowLeft aria-hidden />
                {place.previous.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {place.next ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/learn/${place.next.slug}`}>
                Next: {place.next.title}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/roadmaps/${place.roadmap.slug}`}>Back to the roadmap</Link>
            </Button>
          )}
        </nav>
      )}
    </article>
  );
}
