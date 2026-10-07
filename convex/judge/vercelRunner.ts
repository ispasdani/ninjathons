"use node";
/**
 * Runs jobs in Vercel Sandbox (docs/notes/decisions.md §5): a fresh Firecracker
 * microVM per job, network blocked, stopped as soon as the harness returns.
 *
 * Needs VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in the Convex
 * environment, and SANDBOX_IMAGE for the compiled languages: our runner image
 * in Vercel Container Registry (runner:<commit sha>, pushed by
 * .github/workflows/runner-image.yml). JavaScript, TypeScript and Python run
 * in Vercel's managed image (Node.js 24, Python 3.14), which starts faster.
 * SANDBOX_REGION overrides the region. The
 * default is iad1: measured from our eu-west-1 Convex deployment on 3 Oct
 * 2026, iad1 created sandboxes in ~280 ms and verdicts came in 1.2–2.7 s;
 * dub1, though nearer, took ~650 ms to create and 2–4.4 s per verdict.
 */
import { gzipSync } from "node:zlib";

import { Sandbox } from "@vercel/sandbox";

import { DRIVE_DIR, HARNESS_FILE, HARNESS_SOURCE, JOB_FILE } from "./harness";
import type { CodeRunner, RunJob, RunOutput } from "./types";

// /tmp already exists, which saves a mkdir round trip; each sandbox is fresh.
const DIR = "/tmp";

export class RunnerNotConfiguredError extends Error {}

const MANAGED_IMAGE = "vercel/sandbox/universal";

function imageFor(job: RunJob): string {
  if (job.image === "managed") return MANAGED_IMAGE;
  const image = process.env.SANDBOX_IMAGE;
  if (!image) {
    throw new RunnerNotConfiguredError(
      "Compiled languages need the runner image: set SANDBOX_IMAGE=runner:<commit sha> in the Convex dashboard.",
    );
  }
  return image;
}

/** The Vercel project sandboxes and drives belong to, from the Convex environment. */
export function sandboxCredentials() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !teamId || !projectId) {
    throw new RunnerNotConfiguredError(
      "Code runner not configured: set VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in the Convex dashboard.",
    );
  }
  return { token, teamId, projectId };
}

export function sandboxRegion() {
  return (process.env.SANDBOX_REGION || "iad1") as "iad1";
}

export function vercelRunner(): CodeRunner {
  const credentials = sandboxCredentials();
  const stopping: Promise<unknown>[] = [];
  return {
    async close() {
      await Promise.all(stopping);
    },
    async run(job: RunJob): Promise<RunOutput> {
      const t0 = Date.now();
      // Hidden test inputs on a drive are mounted read-only by name, not uploaded.
      const drive = job.drive;
      const tests = job.tests.length + (job.drive?.count ?? 0);
      const sandbox = await Sandbox.create({
        ...credentials,
        image: imageFor(job),
        region: sandboxRegion(),
        mounts: drive ? { [DRIVE_DIR]: { drive: drive.name, mode: "snapshot" } } : undefined,
        networkPolicy: "deny-all",
        persistent: false,
        resources: { vcpus: 2 },
        // Every test at its limit, plus room for start-up and compiling.
        timeout: Math.min(5 * 60_000, tests * job.timeLimitMs + 60_000),
      });
      const t1 = Date.now();
      try {
        // The job carries the user's files: the harness writes them where only the
        // isolated user can read them, and deletes the job before running anything.
        await sandbox.writeFiles([
          { path: `${DIR}/${HARNESS_FILE}`, content: HARNESS_SOURCE },
          { path: `${DIR}/${JOB_FILE}`, content: gzipSync(JSON.stringify({ ...job, isolate: true }), { level: 6 }) },
        ]);
        const t2 = Date.now();
        const result = await sandbox.runCommand({ cmd: "node", args: [HARNESS_FILE, JOB_FILE], cwd: DIR });
        const t3 = Date.now();
        const stdout = await result.stdout();
        const t4 = Date.now();
        if (result.exitCode !== 0) {
          throw new Error(`harness exited with ${result.exitCode}: ${(await result.stderr()).slice(0, 2000)}`);
        }
        console.log(
          `sandbox: create ${t1 - t0}, write ${t2 - t1}, run ${t3 - t2}, read ${t4 - t3} ms; ${tests} tests${drive ? " (drive)" : ""}`,
        );
        return JSON.parse(stdout) as RunOutput;
      } finally {
        // Stopping takes seconds; it runs while the caller saves the verdict.
        stopping.push(sandbox.stop().catch((error) => console.error("sandbox stop failed", error)));
      }
    },
  };
}
