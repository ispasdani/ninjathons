import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type LessonStateValue = "new" | "opened" | "finished";

/**
 * A lesson's state as a small node: an empty ring, a ring with a dot once
 * opened, and a brand check once finished (your progress, design.md 2.7).
 */
export function LessonState({ state, className }: { state: LessonStateValue; className?: string }) {
  const label = state === "finished" ? "Finished" : state === "opened" ? "Started" : "Not started";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border bg-background",
        state === "finished" && "border-transparent bg-brand text-brand-foreground",
        state === "opened" && "border-border-strong",
        className,
      )}
    >
      {state === "finished" && <Check className="size-3" strokeWidth={3} />}
      {state === "opened" && <span className="size-1.5 rounded-full bg-foreground" />}
    </span>
  );
}
