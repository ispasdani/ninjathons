"use node";
/**
 * Runs jobs in Vercel Sandbox (docs/notes/decisions.md §5): a fresh Firecracker
 * microVM per job, network blocked, stopped as soon as the harness returns.
 *
 * Needs VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in the Convex
 * environment. SANDBOX_IMAGE overrides the image; the default managed image
 * has Node.js 24 and Python 3.14, enough for phase 1. The custom image with
 * every compiler comes in phase 2.
 */
import { Sandbox } from "@vercel/sandbox";

import { HARNESS_FILE, HARNESS_SOURCE, JOB_FILE } from "./harness";
import type { CodeRunner, RunJob, RunOutput } from "./types";

const DIR = "/tmp/job";

export class RunnerNotConfiguredError extends Error {}

export function vercelRunner(): CodeRunner {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !teamId || !projectId) {
    throw new RunnerNotConfiguredError(
      "Code runner not configured: set VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in the Convex dashboard.",
    );
  }
  return {
    async run(job: RunJob): Promise<RunOutput> {
      const started = Date.now();
      const sandbox = await Sandbox.create({
        token,
        teamId,
        projectId,
        image: process.env.SANDBOX_IMAGE || "vercel/sandbox/universal",
        networkPolicy: "deny-all",
        persistent: false,
        resources: { vcpus: 2 },
        // Every test at its limit, plus room for start-up and compiling.
        timeout: Math.min(5 * 60_000, job.tests.length * job.timeLimitMs + 60_000),
      });
      const created = Date.now();
      try {
        await sandbox.mkDir(DIR);
        await sandbox.writeFiles([
          ...Object.entries(job.files).map(([path, content]) => ({ path: `${DIR}/${path}`, content })),
          { path: `${DIR}/${HARNESS_FILE}`, content: HARNESS_SOURCE },
          { path: `${DIR}/${JOB_FILE}`, content: JSON.stringify(job) },
        ]);
        const result = await sandbox.runCommand({ cmd: "node", args: [HARNESS_FILE, JOB_FILE], cwd: DIR });
        const stdout = await result.stdout();
        if (result.exitCode !== 0) {
          throw new Error(`harness exited with ${result.exitCode}: ${(await result.stderr()).slice(0, 2000)}`);
        }
        console.log(`sandbox: create ${created - started} ms, run ${Date.now() - created} ms, ${job.tests.length} tests`);
        return JSON.parse(stdout) as RunOutput;
      } finally {
        await sandbox.stop().catch(() => {});
      }
    },
  };
}
