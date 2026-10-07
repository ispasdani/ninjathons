import type { Metadata } from "next";

import { FindMatch } from "@/components/play/find-match";

export const metadata: Metadata = { title: "Play" };

export default function PlayPage() {
  return <FindMatch />;
}
