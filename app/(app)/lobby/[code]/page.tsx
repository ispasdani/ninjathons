import type { Metadata } from "next";

import { LobbyPage } from "@/components/territory/lobby-page";

export const metadata: Metadata = { title: "Territory lobby" };

export default async function Page({ params }: PageProps<"/lobby/[code]">) {
  const { code } = await params;
  return <LobbyPage code={code} />;
}
