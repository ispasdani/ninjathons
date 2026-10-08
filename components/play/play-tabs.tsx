"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODES = [
  { href: "/play", label: "1v1 race" },
  { href: "/play/territory", label: "Territory" },
] as const;

/** The match modes on Play, as links so each has its own address. */
export function PlayTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Match modes" className="flex w-fit rounded-md border p-0.5">
      {MODES.map((mode) => (
        <Link
          key={mode.href}
          href={mode.href}
          aria-current={pathname === mode.href ? "page" : undefined}
          className="flex h-7 items-center rounded-sm px-2.5 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:text-foreground aria-[current=page]:bg-bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          {mode.label}
        </Link>
      ))}
    </nav>
  );
}
