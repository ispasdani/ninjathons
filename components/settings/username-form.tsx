"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { useUsernameCheck, usernameErrorMessage } from "@/components/onboarding/username-form";
import { Button } from "@/components/ui/button";
import { WindowCard } from "@/components/ui/window-card";
import { api } from "@/convex/_generated/api";
import {
  USERNAME_COOLDOWN_DAYS,
  USERNAME_COOLDOWN_MS,
  USERNAME_MAX,
  USERNAME_RESERVED_DAYS,
} from "@/convex/lib/usernames";
import { useNow } from "@/lib/use-now";

/**
 * Changes the username after onboarding (decisions §1). Progress is keyed to
 * the account, not the name, so nothing moves; the server enforces the
 * 30-day cooldown and holds the old name for 90 days.
 */
export function UsernameSettingsForm() {
  const user = useQuery(api.user.getCurrentUser);
  const setUsername = useMutation(api.user.setUsername);
  const [value, setValue] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  const saved = user?.username ?? "";
  const current = value ?? saved;
  const { name, message, available } = useUsernameCheck(current, !!user?.username && current.trim() !== saved);

  useEffect(() => {
    if (state !== "saved") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  if (!user?.username) return <p className="text-[13px] text-muted-foreground">Loading…</p>;

  const changed = name !== saved;
  const nextChange =
    user.usernameChangedAt !== undefined && now - user.usernameChangedAt < USERNAME_COOLDOWN_MS
      ? new Date(user.usernameChangedAt + USERNAME_COOLDOWN_MS)
      : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!changed || !available || state === "saving") return;
    setState("saving");
    setError(null);
    try {
      await setUsername({ username: name });
      setValue(null);
      setState("saved");
    } catch (e) {
      setError(usernameErrorMessage(e));
      setState("idle");
    }
  }

  return (
    <WindowCard as="form" file="username.exe" color="plain" bodyClassName="block p-6" onSubmit={submit}>
      <label htmlFor="username" className="text-[13px] font-medium">
        Username
      </label>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Your XP, badges and games stay with you. You can change it once every {USERNAME_COOLDOWN_DAYS} days (letter
        case any time). Your old name sends visitors to the new one, and only you can take it back, for{" "}
        {USERNAME_RESERVED_DAYS} days.
        {nextChange && <> Your next change is possible from {nextChange.toLocaleDateString()}.</>}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex w-full max-w-xs items-center rounded-md border border-border bg-background px-3 transition-colors focus-within:outline-2 focus-within:outline-ring hover:border-border-strong dark:bg-bg-secondary">
          <span className="font-mono text-[13px] text-muted-foreground">@</span>
          <input
            id="username"
            autoComplete="off"
            spellCheck={false}
            maxLength={USERNAME_MAX + 5}
            value={current}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={changed && message ? true : undefined}
            aria-describedby="username-status"
            className="h-9 w-full bg-transparent pl-0.5 font-mono text-[13px] outline-none"
          />
        </div>
        <Button type="submit" disabled={!changed || !available || state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </Button>
      </div>
      <p
        id="username-status"
        role={error ? "alert" : undefined}
        aria-live="polite"
        className={error ? "mt-2 min-h-4 text-[13px] text-destructive" : "mt-2 min-h-4 text-xs text-muted-foreground"}
      >
        {error ??
          (state === "saved"
            ? "Saved"
            : changed
              ? (message ?? (available ? `@${name} is available.` : name ? "Checking…" : ""))
              : "")}
      </p>
    </WindowCard>
  );
}
