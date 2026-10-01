import Link from "next/link";

import { site } from "@/lib/site";
import { HeaderAuth } from "./header-auth";
import { ThemeToggle } from "./theme-toggle";

// Sticky 64px header (design.md 5): 80% background with blur, 1px bottom border.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[84rem] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-[15px] font-medium tracking-tight">
          {site.name}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
