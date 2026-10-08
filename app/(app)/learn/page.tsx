import { preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";

import { LearnHome } from "@/components/learn/learn-home";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Learn",
  description: "Roadmaps and free tutorials that teach programming, data structures and algorithms through real problems.",
};

// Public, like the problem pages: rendered with the signed-out view, then live and yours once signed in.
export default async function LearnPage() {
  const preloaded = await preloadQuery(api.learn.overview);
  return <LearnHome preloaded={preloaded} />;
}
