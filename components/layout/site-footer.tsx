import Link from "next/link";

import { site } from "@/lib/site";
import { Logo } from "./logo";

// Column groups with mono labels over 13px link lists (design.md 5). Only pages
// that exist; About, Contact and the legal pages join when they're written.
const COLUMNS = [
  {
    label: "Platform",
    links: [
      ["/problems", "Practice"],
      ["/play", "1v1 and Territory"],
      ["/daily", "Daily challenge"],
      ["/weekly", "Weekly challenge"],
      ["/ninjathons", "Ninjathons"],
    ],
  },
  {
    label: "Learn",
    links: [
      ["/learn", "Roadmaps"],
      ["/learn", "Tutorials"],
    ],
  },
  {
    label: "Community",
    links: [
      ["/leaderboards", "Leaderboards"],
      ["/badges", "Badges"],
      ["/groups", "Groups"],
    ],
  },
  {
    label: "Account",
    links: [
      ["/pro", "Pro"],
      ["/sign-up", "Sign up"],
      ["/sign-in", "Sign in"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[84rem] flex-col gap-10 px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <Logo height={22} />
            <span className="text-[13px] leading-[19px] text-muted-foreground">
              Coding challenges, 1v1 and Territory matches, roadmaps and ninjathons.
            </span>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.label} aria-label={column.label} className="flex flex-col gap-2.5 text-[13px]">
              <span className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                {column.label}
              </span>
              {column.links.map(([href, label]) => (
                <Link key={label} href={href} className="hover:text-text-secondary">
                  {label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {site.name}
        </span>
      </div>
    </footer>
  );
}
