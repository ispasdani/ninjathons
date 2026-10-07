/**
 * Runs jobs on this computer through the same harness Vercel Sandbox runs.
 * For problems:check and tests only: it never runs code from users.
 *
 * Two modes, chosen by RUNNER (docker or host):
 * - docker (the default when the image exists): inside the runner image
 *   (runner/Dockerfile), so all 7 languages work, with the same compilers as
 *   the sandbox. One container stays up and each job runs in it with
 *   `docker exec`, which is much faster than a container per job. Build the
 *   image with `npm run runner:build`; RUNNER_IMAGE overrides its name.
 * - host: with the Node.js and Python installed here (JavaScript, TypeScript
 *   and Python only). Isolates nothing.
 */
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import { HARNESS_FILE, HARNESS_SOURCE, JOB_FILE } from "../../convex/judge/harness";
import type { CodeRunner, RunJob, RunOutput } from "../../convex/judge/types";

export const RUNNER_IMAGE = process.env.RUNNER_IMAGE || "ninjathons-runner:local";

let mode: "docker" | "host" | undefined;

/** docker or host, from RUNNER, else docker when the image is there. */
export function runnerMode(): "docker" | "host" {
  if (mode) return mode;
  const wanted = process.env.RUNNER;
  if (wanted === "docker" || wanted === "host") return (mode = wanted);
  if (wanted) throw new Error(`RUNNER should be docker or host, not ${wanted}`);
  const image = spawnSync("docker", ["image", "inspect", RUNNER_IMAGE], { stdio: "ignore" });
  return (mode = image.status === 0 ? "docker" : "host");
}

/** Writes the harness and the gzipped job into `dir`; the harness writes the job's files. */
function writeJob(dir: string, job: RunJob): void {
  writeFileSync(join(dir, HARNESS_FILE), HARNESS_SOURCE);
  writeFileSync(join(dir, JOB_FILE), gzipSync(JSON.stringify(job)));
}

function parseOutput(status: number | null, stdout: string, stderr: string): RunOutput {
  if (status !== 0) throw new Error(`harness failed (exit ${status}): ${stderr}`);
  return JSON.parse(stdout) as RunOutput;
}

// --- host -------------------------------------------------------------------

// Windows installs Python as `python`, not `python3`.
// Commands wrapped in `sh -c "ulimit ...; exec <command>"` (memory limits)
// run unwrapped here, without the limits: Windows has no sh.
function hostCommand(argv: string[]): string[] {
  const wrapped = argv[0] === "sh" && argv[1] === "-c" ? argv[2].match(/exec (.+)$/) : null;
  if (wrapped) argv = wrapped[1].split(" ");
  if (process.platform === "win32" && argv[0] === "python3") return ["python", ...argv.slice(1)];
  return argv;
}

const NEEDS_IMAGE = new Set(["javac", "java", "cs-build", "dotnet", "g++", "rustc", "./solution"]);

async function runOnHost(job: RunJob): Promise<RunOutput> {
  const tool = hostCommand(job.compile ?? job.run)[0];
  if (NEEDS_IMAGE.has(tool)) {
    throw new Error(`${tool} runs in the runner image: build it with \`npm run runner:build\` (needs Docker)`);
  }
  const dir = mkdtempSync(join(tmpdir(), "ninjathons-run-"));
  try {
    writeJob(dir, { ...job, compile: job.compile && hostCommand(job.compile), run: hostCommand(job.run) });
    const result = spawnSync(process.execPath, [HARNESS_FILE, JOB_FILE], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    return parseOutput(result.status, result.stdout, result.stderr || String(result.error ?? ""));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// --- docker -----------------------------------------------------------------

let container: { id: string; root: string } | undefined;

/**
 * Starts the shared container on first use: no network, the jobs folder
 * mounted at /jobs. It stops itself after 30 minutes in case this process
 * dies without cleaning up (test workers can).
 */
function startContainer(): { id: string; root: string } {
  if (container) return container;
  const root = mkdtempSync(join(tmpdir(), "ninjathons-docker-"));
  chmodSync(root, 0o777);
  const result = spawnSync(
    "docker",
    ["run", "-d", "--rm", "--network", "none", "-v", `${root}:/jobs`, RUNNER_IMAGE, "sleep", "1800"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`couldn't start the runner container: ${result.stderr || result.error}`);
  const id = result.stdout.trim();
  container = { id, root };
  process.once("exit", () => {
    spawnSync("docker", ["rm", "-f", id], { stdio: "ignore" });
    rmSync(root, { recursive: true, force: true });
  });
  return container;
}

async function runInDocker(job: RunJob): Promise<RunOutput> {
  const { id, root } = startContainer();
  const dir = mkdtempSync(join(root, "job-"));
  // The image runs as an unprivileged user that must write compiler output here.
  chmodSync(dir, 0o777);
  try {
    writeJob(dir, { ...job, isolate: true });
    // Async, so tests can run jobs side by side.
    const { status, stdout, stderr } = await new Promise<{ status: number | null; stdout: string; stderr: string }>(
      (resolve, reject) => {
        // As root, so the harness can run the code isolated, as in Vercel Sandbox.
        const child = spawn("docker", ["exec", "-u", "root", "-w", `/jobs/${basename(dir)}`, id, "node", HARNESS_FILE, JOB_FILE]);
        const out: Buffer[] = [];
        const err: Buffer[] = [];
        child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
        child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
        child.on("error", reject);
        child.on("close", (code) =>
          resolve({ status: code, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") }),
        );
      },
    );
    return parseOutput(status, stdout, stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const localRunner: CodeRunner = {
  run: (job) => (runnerMode() === "docker" ? runInDocker(job) : runOnHost(job)),
};

/** Runs a Python script (a test generator) and returns its stdout: in the image, or with the local Python. */
export function runPythonScript(script: string): string {
  const docker = runnerMode() === "docker";
  const argv = docker
    ? ["docker", "run", "--rm", "--network", "none", "-v", `${resolve(dirname(script))}:/script:ro`, RUNNER_IMAGE, "python3", `/script/${basename(script)}`]
    : [...hostCommand(["python3"]), script];
  const result = spawnSync(argv[0], argv.slice(1), { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${script} failed: ${result.stderr || result.error}`);
  return result.stdout;
}
