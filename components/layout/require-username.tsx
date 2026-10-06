"use client";

import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";

/**
 * Sends signed-in users who haven't picked a username yet to onboarding,
 * then back to the page they wanted. User experience only: anything that
 * needs a username checks for it in Convex.
 */
export function RequireUsername() {
  const user = useQuery(api.user.getCurrentUser);
  const pathname = usePathname();
  const router = useRouter();
  const missing = user !== undefined && user !== null && !user.username;

  useEffect(() => {
    if (missing && pathname !== "/onboarding") {
      router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
    }
  }, [missing, pathname, router]);

  return null;
}
