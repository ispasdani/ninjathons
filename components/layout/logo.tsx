import Image from "next/image";

import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

// The full lockup is 1266 × 208 (design.md 0.1).
const RATIO = 1266 / 208;

/**
 * The Ninjathons logo (design.md 0.1): the full lockup, ink on light and white on
 * dark. `markOnPhones` swaps to the shuriken mark alone below `sm`, where the
 * header has no room for the wordmark.
 */
export function Logo({ height = 20, markOnPhones, className }: { height?: number; markOnPhones?: boolean; className?: string }) {
  const width = Math.round(height * RATIO);
  return (
    <span className={cn("flex items-center", className)}>
      <Image
        src="/logo-full.svg"
        alt={site.name}
        width={width}
        height={height}
        priority
        className={markOnPhones ? "hidden sm:block sm:dark:hidden" : "block dark:hidden"}
      />
      <Image
        src="/logo-full-white.svg"
        alt={site.name}
        width={width}
        height={height}
        priority
        className={markOnPhones ? "hidden sm:dark:block" : "hidden dark:block"}
      />
      {markOnPhones && (
        <Image src="/logo.svg" alt={site.name} width={24} height={24} priority className="block sm:hidden dark:invert" />
      )}
    </span>
  );
}
