"use node";
/**
 * Fills a drive with one hidden tests file's inputs, claimed by
 * testDrives.claim. Inputs only: the expected outputs stay in Convex. Each
 * file is private to the harness (mode 600), so the user's code, which runs
 * as `nobody`, can't read it.
 */
import { gzipSync } from "node:zlib";

import { Drive, Sandbox } from "@vercel/sandbox";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { DRIVE_DIR, DRIVE_FILES } from "./judge/harness";
import { sandboxCredentials, sandboxRegion } from "./judge/vercelRunner";
import { encodeArgs } from "./judge/wire";

// Tests files are at most tens of megabytes; this is the drive's ceiling.
const MAX_SIZE = 1024 ** 3;

export const fill = internalAction({
  args: { file: v.id("_storage"), drive: v.string(), problemId: v.id("problems") },
  handler: async (ctx, { file, drive: name, problemId }) => {
    const judge = await ctx.runQuery(internal.testDrives.judgeOf, { problemId });
    const blob = await ctx.storage.get(file);
    if (!judge || !blob) return;
    const inputs = (JSON.parse(await blob.text()) as { input: string }[]).map((t) => t.input);

    const files = [{ path: `${DRIVE_DIR}/${DRIVE_FILES.json}`, content: gzipSync(JSON.stringify(inputs)) }];
    // Languages without a JSON parser read the token format (wire.ts); it
    // depends only on the signature, so one copy serves them all.
    if (judge.mode === "function") {
      const tokens = inputs.map((input) => encodeArgs(judge.signature, input));
      files.push({ path: `${DRIVE_DIR}/${DRIVE_FILES.tokens}`, content: gzipSync(JSON.stringify(tokens)) });
    }

    const credentials = sandboxCredentials();
    const drive = await Drive.getOrCreate({ ...credentials, name, region: sandboxRegion(), maxSize: MAX_SIZE });
    // Vercel's managed image starts fastest; nothing is compiled here.
    const sandbox = await Sandbox.create({
      ...credentials,
      region: sandboxRegion(),
      networkPolicy: "deny-all",
      persistent: false,
      timeout: 2 * 60_000,
      mounts: { [DRIVE_DIR]: drive },
    });
    try {
      await sandbox.writeFiles(files);
      const done = await sandbox.runCommand({
        cmd: "sh",
        args: ["-c", `chmod 600 ${files.map((f) => f.path).join(" ")} && sync`],
      });
      if (done.exitCode !== 0) throw new Error(`couldn't finish the drive: ${await done.stderr()}`);
    } finally {
      // The drive is only safe to mount once this sandbox has let go of it.
      await sandbox.stop();
    }
    await ctx.runMutation(internal.testDrives.markReady, { file, bytes: files[0].content.length });
    console.log(`test drive ${name}: ${inputs.length} inputs`);
  },
});
