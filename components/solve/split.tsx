"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** "row": side by side, dragged left/right. "column": stacked, dragged up/down. */
  direction: "row" | "column";
  /** Remembers the size in this browser under this key. */
  storageKey: string;
  /** Size of the first panel, in percent. */
  initial: number;
  min?: number;
  max?: number;
  label: string;
  first: ReactNode;
  second: ReactNode;
};

function readSize(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Two panels with a drag handle between them (design.md 5.2, the solve view).
 * The handle also works with the keyboard: focus it and use the arrow keys.
 * Below the lg breakpoint the panels simply stack, without a handle.
 */
export function Split({ direction, storageKey, initial, min = 20, max = 80, label, first, second }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(initial);
  const row = direction === "row";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved size after hydration
    setSize(readSize(storageKey, initial));
  }, [storageKey, initial]);

  function update(next: number) {
    const clamped = Math.min(max, Math.max(min, next));
    setSize(clamped);
    try {
      localStorage.setItem(storageKey, String(Math.round(clamped * 10) / 10));
    } catch {
      // Storage blocked: the size just isn't remembered.
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) =>
      update(row ? ((e.clientX - box.left) / box.width) * 100 : ((e.clientY - box.top) / box.height) * 100);
    const handle = event.currentTarget;
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      document.body.style.removeProperty("user-select");
    };
    document.body.style.userSelect = "none";
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    const back = row ? "ArrowLeft" : "ArrowUp";
    const forward = row ? "ArrowRight" : "ArrowDown";
    if (event.key === back) update(size - step);
    else if (event.key === forward) update(size + step);
    else if (event.key === "Home") update(min);
    else if (event.key === "End") update(max);
    else return;
    event.preventDefault();
  }

  return (
    <div
      ref={container}
      style={{ "--split": `${size}%` } as React.CSSProperties}
      className={`flex min-h-0 min-w-0 flex-1 flex-col ${row ? "lg:flex-row" : ""}`}
    >
      <div className={`min-h-0 min-w-0 ${row ? "lg:w-(--split)" : "lg:h-(--split)"} flex flex-col`}>{first}</div>
      <div
        role="separator"
        aria-label={label}
        aria-orientation={row ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(size)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className={`group relative hidden shrink-0 touch-none bg-border transition-colors duration-150 ease-out-quad hover:bg-border-strong focus-visible:bg-ring focus-visible:outline-none lg:block ${
          row ? "w-px cursor-col-resize" : "h-px cursor-row-resize"
        }`}
      >
        {/* A wider invisible grab area around the 1px line. */}
        <span className={`absolute ${row ? "inset-y-0 -left-1.5 w-3" : "inset-x-0 -top-1.5 h-3"}`} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{second}</div>
    </div>
  );
}
