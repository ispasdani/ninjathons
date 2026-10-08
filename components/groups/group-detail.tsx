"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GroupLobbies } from "@/components/territory/group-lobbies";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

/**
 * One group: its invite code, members and, for the owner, the controls.
 * Destructive actions ask once more inline instead of in a dialog.
 */
export function GroupDetail({ groupId }: { groupId: string }) {
  const router = useRouter();
  // Signed-in only: wait for Convex to have the token, or the query throws.
  const { isAuthenticated } = useConvexAuth();
  const group = useQuery(api.groups.get, isAuthenticated ? { groupId } : "skip");
  const rename = useMutation(api.groups.rename);
  const regenerate = useMutation(api.groups.regenerateInvite);
  const removeMember = useMutation(api.groups.removeMember);
  const leave = useMutation(api.groups.leave);
  const remove = useMutation(api.groups.remove);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState<"leave" | "delete" | Id<"users"> | null>(null);

  if (group === undefined) return <p className="text-[13px] text-muted-foreground">Loading…</p>;
  if (group === null) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl">Group not found</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          It doesn&apos;t exist, it was deleted, or you&apos;re not a member.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/groups">Your groups</Link>
        </Button>
      </div>
    );
  }

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setConfirming(null);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(group!.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const id = group._id;

  return (
    <div className="max-w-3xl">
      <Link href="/groups" className="text-[13px] text-text-secondary hover:underline">
        ← Your groups
      </Link>

      <header className="mt-4">
        <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Group</p>
        {editing ? (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await rename({ groupId: id, name });
                setEditing(false);
              });
            }}
          >
            <input
              aria-label="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
              className="h-9 w-full max-w-sm rounded-md border bg-background px-3 text-[13px] outline-none hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-bg-secondary"
            />
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl text-balance sm:text-4xl">{group.name}</h1>
            {group.isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setName(group.name);
                  setEditing(true);
                }}
              >
                Rename
              </Button>
            )}
          </div>
        )}
        <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
          {group.memberCount} of 100 members
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-4 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border bg-bg-secondary p-6">
          <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Invite code</p>
          <p className="mt-3 font-mono text-2xl font-medium tracking-[0.12em]">{group.inviteCode}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
            {group.isOwner && (
              <Button variant="ghost" size="sm" onClick={() => run(() => regenerate({ groupId: id }))}>
                New code
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Anyone with the code can join from the Groups page.</p>
        </div>
        <div className="flex flex-col justify-between rounded-md border p-6">
          <div>
            <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Leaderboards
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground">See how the group ranks on Level, this month and 1v1.</p>
          </div>
          <Button variant="outline" size="sm" className="mt-4 self-start" asChild>
            <Link href={`/leaderboards?scope=group&group=${id}`}>Group leaderboard</Link>
          </Button>
        </div>
      </section>

      <GroupLobbies groupId={id} />

      <section className="mt-10">
        <h2 className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Members</h2>
        <ul className="mt-3 divide-y rounded-md border">
          {group.members.map((m) => (
            <li key={m.userId} className="flex min-h-11 flex-wrap items-center gap-3 px-4 py-2 text-[13px]">
              {m.imageUrl ? (
                // Clerk avatar URLs; next/image would need every Clerk host configured.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="" className="size-6 rounded-full bg-bg-tertiary" />
              ) : (
                <span className="size-6 rounded-full bg-bg-tertiary" />
              )}
              <span className="font-medium">{m.username ? `@${m.username}` : m.name}</span>
              {m.isOwner && (
                <span className="rounded-sm bg-bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Owner</span>
              )}
              {group.isOwner && !m.isOwner && (
                <span className="ml-auto flex gap-2">
                  {confirming === m.userId ? (
                    <>
                      <Button variant="destructive" size="xs" onClick={() => run(() => removeMember({ groupId: id, userId: m.userId }))}>
                        Remove {m.username ? `@${m.username}` : m.name}
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="xs" onClick={() => setConfirming(m.userId)}>
                      Remove
                    </Button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap gap-2 border-t pt-6">
        {confirming === "leave" ? (
          <>
            <Button
              variant="destructive"
              onClick={() =>
                run(async () => {
                  await leave({ groupId: id });
                  router.push("/groups");
                })
              }
            >
              {group.isOwner && group.memberCount > 1 ? "Leave and hand over the group" : "Leave group"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </>
        ) : confirming === "delete" ? (
          <>
            <Button
              variant="destructive"
              onClick={() =>
                run(async () => {
                  await remove({ groupId: id });
                  router.push("/groups");
                })
              }
            >
              Delete for everyone
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setConfirming("leave")}>
              Leave group
            </Button>
            {group.isOwner && (
              <Button variant="ghost" className="text-destructive" onClick={() => setConfirming("delete")}>
                Delete group
              </Button>
            )}
          </>
        )}
      </section>
      {confirming === "leave" && group.isOwner && group.memberCount > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">The member who joined first becomes the owner.</p>
      )}
      {confirming === "leave" && group.memberCount === 1 && (
        <p className="mt-2 text-xs text-muted-foreground">You&apos;re the only member, so the group will be deleted.</p>
      )}
      {confirming === "delete" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Members lose access at once. You can restore it from Groups for 30 days.
        </p>
      )}
    </div>
  );
}
