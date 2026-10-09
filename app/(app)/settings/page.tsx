import type { Metadata } from "next";

import Link from "next/link";

import { CountryForm } from "@/components/settings/country-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Account</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Settings</h1>
      <section className="mt-8">
        <h2 className="mb-3 font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Profile</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-6">
          <p className="text-[13px] text-muted-foreground">Your bio, links, languages, pinned solutions and theme.</p>
          <Link href="/settings/profile" className="text-[13px] font-medium text-brand-text hover:underline">
            Edit profile
          </Link>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Leaderboards
        </h2>
        <CountryForm />
      </section>
    </div>
  );
}
