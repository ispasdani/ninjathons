"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/use-now";

const RESTORE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-bg-secondary";

/** One input and a button that runs `action`, with its error under it. */
function InlineForm({
  label,
  placeholder,
  button,
  maxLength,
  mono,
  action,
}: {
  label: string;
  placeholder: string;
  button: string;
  maxLength: number;
  mono?: boolean;
  action: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await action(value);
      setValue("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md border p-6">
      <label className="text-[13px] font-medium" htmlFor={label}>
        {label}
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          className={mono ? `${inputClass} font-mono uppercase placeholder:normal-case` : inputClass}
        />
        <Button type="submit" variant="outline" disabled={busy || !value.trim()}>
          {button}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

/** Your groups, plus forms to create one or join one by invite code. */
export function GroupList() {
  const router = useRouter();
  // Signed-in only: wait for Convex to have the token, or the query throws.
  const { isAuthenticated } = useConvexAuth();
  const groups = useQuery(api.groups.mine, isAuthenticated ? {} : "skip");
  const create = useMutation(api.groups.create);
  const join = useMutation(api.groups.join);
  const restore = useMutation(api.groups.restore);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const now = useNow();

  const live = groups?.filter((g) => g.deletedAt === null) ?? [];
  const deleted = groups?.filter((g) => g.deletedAt !== null) ?? [];

  async function restoreGroup(groupId: Id<"groups">) {
    setRestoreError(null);
    try {
      await restore({ groupId });
    } catch (e) {
      setRestoreError(errorMessage(e));
    }
  }

  return (
    <div>
      <header>
        <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Groups</p>
        <h1 className="mt-2 text-3xl text-balance sm:text-4xl">Your groups</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          Private boards for your office or friends. Share the invite code; everyone who joins shows up on the
          group&apos;s leaderboards.
        </p>
      </header>

      <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        <InlineForm
          label="Create a group"
          placeholder="Group name"
          button="Create"
          maxLength={50}
          action={async (name) => {
            const groupId = await create({ name });
            router.push(`/groups/${groupId}`);
          }}
        />
        <InlineForm
          label="Join with a code"
          placeholder="Invite code"
          button="Join"
          maxLength={12}
          mono
          action={async (inviteCode) => {
            const groupId = await join({ inviteCode });
            router.push(`/groups/${groupId}`);
          }}
        />
      </div>

      <section className="mt-10 max-w-3xl">
        {groups === undefined ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : live.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">You&apos;re not in any groups yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {live.map((g) => (
              <li key={g._id}>
                <Link
                  href={`/groups/${g._id}`}
                  className="flex h-14 items-center gap-3 px-4 text-[13px] hover:bg-bg-secondary"
                >
                  <span className="font-medium">{g.name}</span>
                  {g.isOwner && (
                    <span className="rounded-sm bg-bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Owner</span>
                  )}
                  <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
                    {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {deleted.length > 0 && (
          <div className="mt-8">
            <h2 className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Recently deleted
            </h2>
            <ul className="mt-3 divide-y rounded-md border">
              {deleted.map((g) => {
                const daysLeft = Math.max(0, Math.ceil((g.deletedAt! + RESTORE_DAYS * DAY_MS - now) / DAY_MS));
                return (
                  <li key={g._id} className="flex h-14 items-center gap-3 px-4 text-[13px]">
                    <span className="text-text-secondary">{g.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Deleted for good in {daysLeft} {daysLeft === 1 ? "day" : "days"}
                    </span>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => restoreGroup(g._id)}>
                      Restore
                    </Button>
                  </li>
                );
              })}
            </ul>
            {restoreError && (
              <p role="alert" className="mt-2 text-[13px] text-destructive">
                {restoreError}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
