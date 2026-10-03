/// <reference types="vite/client" />
// Shared by every convex/*.test.ts file. Convex skips files with more than one
// dot in the name, so neither this nor the tests are deployed.
import { convexTest } from "convex-test";

import schema from "./schema";

export const modules = import.meta.glob([
  "./**/*.ts",
  "./**/*.js",
  "!./**/*.test.ts",
  "!./**/*.d.ts",
]);

export function setup() {
  return convexTest(schema, modules);
}

/** A Clerk identity as the Convex auth layer would see it. */
export function identity(clerkId: string, extra: Record<string, string> = {}) {
  return { subject: clerkId, tokenIdentifier: `test|${clerkId}`, ...extra };
}
