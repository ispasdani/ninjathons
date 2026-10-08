import type { Metadata } from "next";

import { GameView } from "@/components/territory/game-view";

export const metadata: Metadata = { title: "Territory" };

export default async function Page({ params }: PageProps<"/territory/[gameId]">) {
  const { gameId } = await params;
  return <GameView gameId={gameId} />;
}
