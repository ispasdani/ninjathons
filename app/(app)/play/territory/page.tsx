import type { Metadata } from "next";

import { TerritoryPlay } from "@/components/territory/territory-play";

export const metadata: Metadata = { title: "Territory" };

export default async function Page({ searchParams }: PageProps<"/play/territory">) {
  const { group } = await searchParams;
  return <TerritoryPlay groupId={typeof group === "string" ? group : undefined} />;
}
