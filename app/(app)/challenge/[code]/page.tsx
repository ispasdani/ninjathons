import type { Metadata } from "next";

import { ChallengePage } from "@/components/play/challenge-page";

export const metadata: Metadata = { title: "Challenge" };

export default async function Page({ params }: PageProps<"/challenge/[code]">) {
  const { code } = await params;
  return <ChallengePage code={code} />;
}
