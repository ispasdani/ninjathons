import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { ProfilePage } from "@/components/profile/profile-page";
import { api } from "@/convex/_generated/api";

// The Pro short URL (decisions §18): /<username>. Usernames exclude every
// route name (lib/usernames.ts), and static routes win over this one anyway.

export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchQuery(api.profiles.get, { username: decodeURIComponent(username) });
  if (!profile || profile.redirect !== null || !profile.pro) return { title: "Player not found" };
  const title = `${profile.name} (@${profile.username})`;
  return {
    title,
    description: `Level ${profile.level.level} ${profile.level.title} on Ninjathons`,
    // One page, two addresses: search engines get the /u/ one.
    alternates: { canonical: `/u/${profile.username}` },
  };
}

export default async function ShortProfileRoute({ params }: PageProps<"/[username]">) {
  const { username } = await params;
  const preloaded = await preloadQuery(api.profiles.get, { username: decodeURIComponent(username) });
  const profile = preloadedQueryResult(preloaded);
  if (!profile) notFound();
  if (profile.redirect !== null) permanentRedirect(`/u/${profile.redirect}`);
  // Not Pro (or no longer): the short URL isn't theirs to show, so it goes to /u/ for now.
  if (!profile.pro) redirect(`/u/${profile.username}`);
  return <ProfilePage preloaded={preloaded} />;
}
