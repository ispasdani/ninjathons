"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import {
  checkUsernameRules,
  USERNAME_MAX,
  USERNAME_MESSAGES,
} from "@/convex/lib/usernames";

// Waits for a pause in typing before asking the server whether a name is free.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Picks the username right after sign-up (docs/notes/decisions.md §1). The
 * rules are checked as you type, here and again on the server; whether the
 * name is free comes from the server. `next` is where to go afterwards.
 */
export function UsernameForm({ next }: { next: string }) {
  const router = useRouter();
  const user = useQuery(api.user.getCurrentUser);
  const setUsername = useMutation(api.user.setUsername);

  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = value.trim();
  const rules = name ? checkUsernameRules(name) : null;
  const debounced = useDebounced(name, 300);
  const check = useQuery(
    api.user.checkUsername,
    // Only once the account row exists: the check needs a signed-in user.
    user && !user.username && debounced && !checkUsernameRules(debounced) ? { username: debounced } : "skip",
  );

  // Already has one (another tab, or came back here): carry on.
  useEffect(() => {
    if (user?.username) router.replace(next);
  }, [user?.username, next, router]);

  if (user === undefined || user?.username) {
    return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  }
  if (user === null) {
    return <p className="text-[13px] text-muted-foreground">Setting up your account…</p>;
  }

  const checked = check !== undefined && debounced === name;
  const message = rules
    ? USERNAME_MESSAGES[rules]
    : checked && !check.ok
      ? USERNAME_MESSAGES[check.refusal]
      : null;
  const available = !rules && checked && check.ok;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!available || saving) return;
    setSaving(true);
    setError(null);
    try {
      await setUsername({ username: name });
      router.replace(next);
    } catch (e) {
      const code = e instanceof ConvexError && typeof e.data === "string" ? e.data : "";
      const reason = code.replace(/^USERNAME_/, "").toLowerCase() as keyof typeof USERNAME_MESSAGES;
      setError(USERNAME_MESSAGES[reason] ?? "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="username" className="block text-[13px] font-medium">
        Username
      </label>
      <div className="flex items-center rounded-md border border-border bg-background px-3 transition-colors focus-within:outline-2 focus-within:outline-ring hover:border-border-strong dark:bg-bg-secondary">
        <span className="font-mono text-[13px] text-muted-foreground">@</span>
        <input
          id="username"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          maxLength={USERNAME_MAX + 5}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          aria-invalid={message ? true : undefined}
          aria-describedby="username-status"
          className="h-9 w-full bg-transparent pl-0.5 font-mono text-[13px] outline-none"
        />
      </div>
      <p id="username-status" aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {error ?? message ?? (available ? `@${name} is available.` : name ? "Checking…" : "3 to 20 characters: letters, numbers, _ and -, starting with a letter.")}
      </p>
      <Button type="submit" variant="brand" disabled={!available || saving} className="w-full">
        {saving ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
