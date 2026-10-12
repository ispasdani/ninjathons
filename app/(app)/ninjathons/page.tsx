import type { Metadata } from "next";

import { NinjathonList } from "@/components/ninjathons/ninjathon-list";

export const metadata: Metadata = {
  title: "Ninjathons",
  description: "Team projects with a brief, a deadline and judges. Enter alone or with a team, hand in a repository and a demo.",
};

// Public: anyone can see what's running and what's coming (decisions §19).
export default function Ninjathons() {
  return <NinjathonList />;
}
