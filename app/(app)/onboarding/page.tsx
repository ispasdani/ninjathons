import type { Metadata } from "next";

import { UsernameForm } from "@/components/onboarding/username-form";

export const metadata: Metadata = { title: "Pick your username" };

// Only same-site paths, so ?next= can't send anyone to another site.
function safeNext(next: string | string[] | undefined): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm pt-8">
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Welcome
      </p>
      <h1 className="mt-2 text-3xl">Pick your username</h1>
      <p className="mt-2 mb-8 text-[13px] text-muted-foreground">
        It&apos;s how other players find and challenge you. You can change it later, once every 30 days.
      </p>
      <UsernameForm next={safeNext(next)} />
    </div>
  );
}
