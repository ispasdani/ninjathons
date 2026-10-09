import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProfilePage } from "@/components/profile/profile-page";
import { api } from "@/convex/_generated/api";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchQuery(api.profiles.get, { username: decodeURIComponent(username) });
  if (!profile || profile.redirect !== null) return { title: "Player not found" };
  const title = `${profile.name} (@${profile.username})`;
  const description = `Level ${profile.level.level} ${profile.level.title} on Ninjathons · ${profile.stats.solved} problems solved`;
  return { title, description, openGraph: { title, description, type: "profile" } };
}

// Public, for search (decisions §18): rendered with the public data, then
// live. An old username redirects permanently while it's held (§1). No
// loading.tsx here, so the redirect is a real 308 rather than a streamed one.
export default async function ProfileRoute({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const preloaded = await preloadQuery(api.profiles.get, { username: decodeURIComponent(username) });
  const profile = preloadedQueryResult(preloaded);
  if (!profile) notFound();
  if (profile.redirect !== null) permanentRedirect(`/u/${profile.redirect}`);
  return <ProfilePage preloaded={preloaded} />;
}
