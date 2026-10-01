"use client";

import { Show, UserButton } from "@clerk/nextjs";
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
        <Button asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <UserButton />
      </Show>
    </>
  );
}
