import type { Metadata } from "next";

import { WeeklyPage } from "@/components/weekly/weekly-page";

export const metadata: Metadata = {
  title: "Weekly challenge",
  description: "A themed set of new problems every week, Monday to Sunday. Points by difficulty, time breaks ties.",
};

// Public, like the Daily page: anyone can see this week's set and its theme.
export default function Weekly() {
  return <WeeklyPage />;
}
