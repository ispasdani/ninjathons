"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";

/**
 * Under the header on every signed-in page: a way back to a running match,
 * and challenges waiting for you. A match that's about to start opens by
 * itself, so a challenger who wandered off doesn't miss it.
 */
export function MatchBanner() {
  const { isAuthenticated } = useConvexAuth();
  const current = useQuery(api.matches.current, isAuthenticated ? {} : "skip");
  const challenges = useQuery(api.challenges.mine, isAuthenticated ? {} : "skip");
  const pathname = usePathname();
  const router = useRouter();
  const onMatch = current ? pathname === `/duel/${current._id}` : false;

  useEffect(() => {
    if (current?.status === "countdown" && !onMatch) router.push(`/duel/${current._id}`);
  }, [current, onMatch, router]);

  if (current && !onMatch) {
    return (
      <div role="status" className="border-b bg-bg-secondary">
        <div className="mx-auto flex max-w-[84rem] items-center gap-3 px-4 py-2 text-[13px] sm:px-6 lg:px-8">
          <span className="size-2 animate-pulse rounded-full bg-duel-you" aria-hidden />
          <span>You&apos;re in a match.</span>
          <Link href={`/duel/${current._id}`} className="ml-auto font-medium hover:underline">
            Back to it
          </Link>
        </div>
      </div>
    );
  }

  const incoming = challenges?.incoming ?? [];
  if (incoming.length > 0 && pathname !== "/play") {
    return (
      <div role="status" className="border-b bg-bg-secondary">
        <div className="mx-auto flex max-w-[84rem] items-center gap-3 px-4 py-2 text-[13px] sm:px-6 lg:px-8">
          <span className="size-2 rounded-full bg-duel-opponent" aria-hidden />
          <span>
            {incoming.length === 1
              ? `@${incoming[0].from} challenges you.`
              : `${incoming.length} players challenge you.`}
          </span>
          <Link href="/play" className="ml-auto font-medium hover:underline">
            See {incoming.length === 1 ? "challenge" : "challenges"}
          </Link>
        </div>
      </div>
    );
  }
  return null;
}
