import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NinjathonPage } from "@/components/ninjathons/ninjathon-page";
import { api } from "@/convex/_generated/api";

export async function generateMetadata({ params }: PageProps<"/ninjathons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchQuery(api.ninjathons.get, { slug });
  if (!event) return { title: "Ninjathon not found" };
  return { title: event.title, description: event.teaser || undefined };
}

// Public, for search: rendered with the signed-out view (no brief before the
// start), then live and yours once signed in.
export default async function NinjathonRoute({ params }: PageProps<"/ninjathons/[slug]">) {
  const { slug } = await params;
  const preloaded = await preloadQuery(api.ninjathons.get, { slug });
  if (!preloadedQueryResult(preloaded)) notFound();
  return <NinjathonPage preloaded={preloaded} slug={slug} />;
}
