import type { Metadata } from "next";

import { CountryForm } from "@/components/settings/country-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Account</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Settings</h1>
      <section className="mt-8">
        <h2 className="mb-3 font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Leaderboards
        </h2>
        <CountryForm />
      </section>
    </div>
  );
}
