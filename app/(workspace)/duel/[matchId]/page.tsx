import type { Metadata } from "next";

import { DuelView } from "@/components/duel/duel-view";

export const metadata: Metadata = { title: "1v1 match" };

export default async function DuelPage({ params }: PageProps<"/duel/[matchId]">) {
  const { matchId } = await params;
  return <DuelView matchId={matchId} />;
}
