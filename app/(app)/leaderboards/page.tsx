import type { Metadata } from "next";

import { Leaderboard, type BoardTab, type Scope } from "@/components/leaderboards/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "Level and 1v1 leaderboards, worldwide, by country and for your groups.",
};

const BOARDS: BoardTab[] = ["level", "month", "1v1"];
const SCOPES: Scope[] = ["global", "country", "group"];

function pick<T extends string>(value: string | string[] | undefined, allowed: T[], fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

// Public, like the problem pages; group boards need a signed-in member.
export default async function LeaderboardsPage({ searchParams }: PageProps<"/leaderboards">) {
  const params = await searchParams;
  return (
    <Leaderboard
      board={pick(params.board, BOARDS, "level")}
      scope={pick(params.scope, SCOPES, "global")}
      groupId={typeof params.group === "string" ? params.group : null}
    />
  );
}
