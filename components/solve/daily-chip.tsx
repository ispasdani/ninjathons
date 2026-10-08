"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Flame } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";
import { duration } from "@/lib/duration";
import { useNow } from "@/lib/use-now";

/**
 * On today's daily, starts the player's clock (the first opening counts,
 * decisions §15) and shows it in the toolbar. Renders nothing otherwise.
 * Its own component so the ticking clock doesn't re-render the editor.
 */
export function DailyChip({ slug }: { slug: string }) {
  const { isAuthenticated } = useConvexAuth();
  const today = useQuery(api.daily.today);
  const open = useMutation(api.daily.open);
  const isDaily = today?.problem?.slug === slug;
  const now = useNow(1000);

  useEffect(() => {
    if (isDaily && isAuthenticated) void open({ slug });
  }, [isDaily, isAuthenticated, open, slug]);

  if (!isDaily) return null;
  const me = today.me;
  const time =
    me?.timeMs != null ? `solved in ${duration(me.timeMs)}` : me?.openedAt ? duration(now - me.openedAt) : null;
  return (
    <Link
      href="/daily"
      className="flex items-center gap-1.5 rounded-xs border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      <Flame className="size-3.5 text-brand-text" aria-hidden />
      Daily
      {time && <span className="tabular-nums">· {time}</span>}
    </Link>
  );
}
