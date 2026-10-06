import { RequireUsername } from "@/components/layout/require-username";
import { SiteHeader } from "@/components/layout/site-header";

// Full-screen workspaces (the solve view, later duels): the same header as the
// app, but the page gets the whole width and, on large screens, exactly the
// height below the header. proxy.ts redirects signed-out visitors; Convex
// functions do their own checks.
export default function WorkspaceLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <RequireUsername />
      <main className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-4rem)]">{children}</main>
    </>
  );
}
