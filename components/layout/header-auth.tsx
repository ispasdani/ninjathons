"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { Settings, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Client-side so pages using the header can still be statically generated.
export function HeaderAuth() {
  return (
    <>
      <Show when="signed-out">
        <Button variant="ghost" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        {/* On phones Sign in alone fits; the sign-in page links to sign-up. */}
        <Button className="hidden sm:inline-flex" asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link label="Groups" labelIcon={<Users className="size-4" />} href="/groups" />
            <UserButton.Link label="Settings" labelIcon={<Settings className="size-4" />} href="/settings" />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </>
  );
}
