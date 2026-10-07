/**
 * Which hidden tests files have a drive (schemas/problems.ts, testDrives).
 * Judging asks for the drive of its tests file; when there's none yet it
 * claims one, and testDrivesFill.ts fills it in the background.
 */
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type ActionCtx } from "./_generated/server";
import { LANGUAGES } from "./judge/languages";
import type { Language, SandboxImage } from "./judge/types";

// A fill that hasn't finished after this long is assumed lost and may be retried.
const FILL_RETRY_MS = 10 * 60_000;

/** The drive for this tests file and its size, or null while it isn't ready. */
export const ready = internalQuery({
  args: { file: v.id("_storage") },
  handler: async (ctx, { file }) => {
    const row = await ctx.db
      .query("testDrives")
      .withIndex("by_file", (q) => q.eq("file", file))
      .unique();
    return row?.readyAt ? { drive: row.drive, bytes: row.bytes ?? 0 } : null;
  },
});

/** Starts filling a drive for this tests file, unless one is ready or being filled. */
export const claim = internalMutation({
  args: { file: v.id("_storage"), problemId: v.id("problems") },
  handler: async (ctx, { file, problemId }) => {
    const row = await ctx.db
      .query("testDrives")
      .withIndex("by_file", (q) => q.eq("file", file))
      .unique();
    const now = Date.now();
    if (row && (row.readyAt || now - row.startedAt < FILL_RETRY_MS)) return;
    // Storage ids are unique per deployment and upload, so dev and production
    // never share a drive, and a drive's contents never change.
    const drive = `nj-tests-${file}`;
    if (row) await ctx.db.patch(row._id, { startedAt: now });
    else await ctx.db.insert("testDrives", { file, drive, startedAt: now });
    await ctx.scheduler.runAfter(0, internal.testDrivesFill.fill, { file, drive, problemId });
  },
});

export const markReady = internalMutation({
  args: { file: v.id("_storage"), bytes: v.number() },
  handler: async (ctx, { file, bytes }) => {
    const row = await ctx.db
      .query("testDrives")
      .withIndex("by_file", (q) => q.eq("file", file))
      .unique();
    if (row) await ctx.db.patch(row._id, { readyAt: Date.now(), bytes });
  },
});

/** How the problem is judged, for writing its inputs in the format its drivers read. */
export const judgeOf = internalQuery({
  args: { problemId: v.id("problems") },
  handler: async (ctx, { problemId }) => (await ctx.db.get(problemId))?.judge ?? null,
});

/**
 * Which Submits read their hidden inputs from a drive: SANDBOX_TEST_DRIVES is
 * off, runner (the default) or all. Measured 7 Oct 2026: a mount adds ~0.5 s
 * to starting a sandbox from our runner image but 1–1.5 s to Vercel's managed
 * one, and uploading costs ~0.2 s plus ~0.6 s per MB, so only the compiled
 * languages gain, and only for files of DRIVE_MIN_BYTES or more.
 */
const DRIVE_MIN_BYTES = 1024 * 1024;

function drivesFor(image: SandboxImage) {
  const mode = process.env.SANDBOX_TEST_DRIVES ?? "runner";
  return mode === "all" || (mode === "runner" && image === "runner");
}

/**
 * The drive to read a Submit's hidden inputs from, when there's one ready and
 * this language uses drives; otherwise starts filling one for next time.
 */
export async function hiddenTestsDrive(
  ctx: ActionCtx,
  request: { file: Id<"_storage">; problemId: Id<"problems">; language: Language; count: number },
): Promise<{ name: string; count: number } | undefined> {
  if (!process.env.VERCEL_TOKEN || !drivesFor(LANGUAGES[request.language].image)) return undefined;
  const ready: { drive: string; bytes: number } | null = await ctx.runQuery(internal.testDrives.ready, {
    file: request.file,
  });
  if (!ready) {
    await ctx.runMutation(internal.testDrives.claim, { file: request.file, problemId: request.problemId });
    return undefined;
  }
  return ready.bytes >= DRIVE_MIN_BYTES ? { name: ready.drive, count: request.count } : undefined;
}
