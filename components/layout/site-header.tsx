import Link from "next/link";

import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { HeaderAuth } from "./header-auth";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

// Sticky 64px header (design.md 5): 80% background with blur, 1px bottom border.
// On phones the nav folds into a menu so the header never scrolls sideways.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[84rem] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <MobileNav />
        <Link href="/" className="text-[15px] font-medium tracking-tight">
          {site.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
