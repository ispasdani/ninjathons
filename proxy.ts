import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Redirects signed-out visitors away from the (app) routes. This is for user
// experience only: data is protected by the Convex wrappers in
// convex/lib/functions.ts, never by this file. Marketing and public pages
// (problems, profiles, leaderboards) stay open for search engines.
const isAppRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/play(.*)",
  "/challenge(.*)",
  "/duel(.*)",
  "/solve(.*)",
  "/courses(.*)",
  "/settings(.*)",
  "/groups(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isAppRoute(req)) await auth.protect();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
