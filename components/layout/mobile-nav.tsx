"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";

import { Button } from "@/components/ui/button";

import { NAV_LINKS } from "./nav-links";

/** The main nav on phones, where the header has no room for the links. */
export function MobileNav() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu" className="sm:hidden">
          <Menu />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-44 rounded-md border bg-popover p-1 text-[13px] shadow-overlay"
        >
          {NAV_LINKS.map((link) => (
            <DropdownMenu.Item key={link.href} asChild>
              <Link
                href={link.href}
                className="flex h-9 items-center rounded-sm px-3 outline-none data-highlighted:bg-bg-secondary"
              >
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
