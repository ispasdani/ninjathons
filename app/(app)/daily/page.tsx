import type { Metadata } from "next";

import { DailyPage } from "@/components/daily/daily-page";

export const metadata: Metadata = {
  title: "Daily challenge",
  description: "One problem for everyone, every day. Keep your streak going.",
};

// Public, like the leaderboards: anyone can see today's problem and the fastest solves.
export default function Daily() {
  return <DailyPage />;
}
