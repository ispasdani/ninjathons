"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";

// Creates the Convex users row right after sign-in instead of waiting for the
// Clerk webhook (see user.ensureUser). Renders nothing.
export function EnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.user.ensureUser);

  useEffect(() => {
    if (!isAuthenticated) return;
    ensureUser().catch((error) => {
      // The webhook still creates the row, so this is not fatal.
      console.error("Could not create the user row", error);
    });
  }, [isAuthenticated, ensureUser]);

  return null;
}
