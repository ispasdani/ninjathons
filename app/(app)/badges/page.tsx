import type { Metadata } from "next";

import { BadgeList } from "@/components/progression/badge-list";

export const metadata: Metadata = {
  title: "Badges",
  description: "Every badge, how to earn it and how rare it is.",
};

// Public: anyone can see the badges and their rarity; signed in, you see yours.
export default function BadgesPage() {
  return <BadgeList />;
}
