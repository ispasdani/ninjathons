import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonPage } from "@/components/learn/lesson-page";
import { api } from "@/convex/_generated/api";

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await fetchQuery(api.learn.lesson, { slug });
  if (!lesson) return { title: "Lesson not found" };
  return { title: lesson.title, description: lesson.summary };
}

// Public: tutorials are free pages for search (decisions §17). Rendered with
// the signed-out view, then live and yours once signed in.
export default async function LessonRoute({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const preloaded = await preloadQuery(api.learn.lesson, { slug });
  if (!preloadedQueryResult(preloaded)) notFound();
  return <LessonPage preloaded={preloaded} />;
}
