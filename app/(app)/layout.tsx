import { RequireUsername } from "@/components/layout/require-username";
import { SiteHeader } from "@/components/layout/site-header";
import { MatchBanner } from "@/components/play/match-banner";

// Signed-in app: client-heavy, live Convex subscriptions (docs/03, route groups).
// proxy.ts redirects signed-out visitors, but that is UX only: every Convex
// function these pages call does its own checks.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <MatchBanner />
      <RequireUsername />
      <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
