"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { COUNTRIES } from "@/lib/countries";
import { errorMessage } from "@/lib/errors";

const NONE = "";

/**
 * The country on your leaderboard rows and the board you're ranked on in the
 * Country scope. "Don't show" keeps it off both (plan, trust rules).
 */
export function CountryForm() {
  const user = useQuery(api.user.getCurrentUser);
  const setCountry = useMutation(api.user.setCountry);
  const [value, setValue] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const saved = user?.country ?? NONE;
  const current = value ?? saved;

  useEffect(() => {
    if (state !== "saved") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  if (!user) return <p className="text-[13px] text-muted-foreground">Loading…</p>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setError(null);
    try {
      await setCountry({ country: current === NONE ? null : current });
      setValue(null);
      setState("saved");
    } catch (e) {
      setError(errorMessage(e));
      setState("idle");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md border p-6">
      <label htmlFor="country" className="text-[13px] font-medium">
        Country
      </label>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Shown next to your name on leaderboards, and the Country board you&apos;re ranked on. Changes show within 5
        minutes.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          id="country"
          value={current}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-full max-w-xs rounded-md border bg-background px-2 text-[13px] hover:border-border-strong dark:bg-bg-secondary"
        >
          <option value={NONE}>Don&apos;t show a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={state === "saving" || current === saved}>
          {state === "saving" ? "Saving…" : "Save"}
        </Button>
        {state === "saved" && (
          <span role="status" className="self-center text-[13px] text-muted-foreground">
            Saved
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
