import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoadmapPage } from "@/components/learn/roadmap-page";
import { api } from "@/convex/_generated/api";

export async function generateMetadata({ params }: PageProps<"/roadmaps/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const roadmap = await fetchQuery(api.learn.roadmap, { slug });
  if (!roadmap) return { title: "Roadmap not found" };
  return { title: roadmap.title, description: roadmap.summary };
}

// Public: a roadmap's title and outline are open to everyone (decisions §17).
export default async function RoadmapRoute({ params }: PageProps<"/roadmaps/[slug]">) {
  const { slug } = await params;
  const preloaded = await preloadQuery(api.learn.roadmap, { slug });
  if (!preloadedQueryResult(preloaded)) notFound();
  return <RoadmapPage preloaded={preloaded} />;
}
