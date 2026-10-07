import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { renderCard } from "@/lib/share-card";

export async function GET(_request: Request, { params }: RouteContext<"/m/[matchId]/card">) {
  const { matchId } = await params;
  const result = await fetchQuery(api.matches.result, { id: matchId });
  if (!result) return new Response("Not found", { status: 404 });
  return renderCard(result);
}
