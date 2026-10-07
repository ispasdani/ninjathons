/**
 * The program every runner executes as `node harness.cjs job.json.gz`, inside
 * Vercel Sandbox or in a temporary folder locally. It writes the job's files,
 * compiles once, runs each test with its stdin and a time limit, and prints a
 * RunOutput as JSON. It never sees expected outputs, so it can't decide verdicts.
 *
 * With `isolate`, the user's code runs as `nobody` through setpriv, with every
 * capability dropped (Vercel Sandbox gives all processes all of them, and
 * ambient ones survive a plain user switch), in a folder only it can use. The
 * job file is deleted first, so the code can't read the other tests' inputs.
 *
 * Plain CommonJS with no dependencies, kept as a string so Convex can upload it.
 */
export const HARNESS_FILE = "harness.cjs";
// Gzipped: tests can be megabytes of JSON, and the upload is the slowest step.
export const JOB_FILE = "job.json.gz";
// Where a drive of hidden test inputs is mounted (RunJob.drive).
export const DRIVE_DIR = "/tests";
// The files on such a drive: inputs as JSON, and in the token format of wire.ts.
export const DRIVE_FILES = { json: "json.gz", tokens: "tokens.gz" } as const;

export const HARNESS_SOURCE = String.raw`"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const job = JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[2])).toString("utf8"));
// Hidden inputs from a drive come after the job's own tests. Only this process
// can read the file (mode 600); the user's code can't.
const tests = job.drive
  ? job.tests.concat(JSON.parse(zlib.gunzipSync(fs.readFileSync("/tests/" + job.drive.file)).toString("utf8")))
  : job.tests;
const MAX_BUFFER = 16 * 1024 * 1024;
const MAX_STDERR = 8 * 1024;
const NOBODY = 65534;
const DROP = ["--reuid=" + NOBODY, "--regid=" + NOBODY, "--clear-groups", "--inh-caps=-all", "--ambient-caps=-all", "--bounding-set=-all", "--no-new-privs", "--"];

// The user's files go in their own folder; isolated, only nobody can use it.
let work = process.cwd();
if (job.isolate) {
  fs.unlinkSync(process.argv[2]);
  work = fs.mkdtempSync("/tmp/nj-");
}
for (const [name, content] of Object.entries(job.files)) {
  const file = path.join(work, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (job.isolate) fs.chownSync(file, NOBODY, NOBODY);
}
if (job.isolate) {
  fs.chownSync(work, NOBODY, NOBODY);
  fs.chmodSync(work, 0o700);
}
const env = job.isolate ? { ...process.env, HOME: work, TMPDIR: work } : process.env;

/** A compile or test command, as nobody when isolated. */
function command(argv) {
  return job.isolate ? ["setpriv", ...DROP, ...argv] : argv;
}

const SIGNALS = {
  SIGSEGV: "Segmentation fault: invalid memory access, or a stack overflow",
  SIGBUS: "Bus error: invalid memory access",
  SIGFPE: "Floating point exception: usually an integer division by zero",
  SIGILL: "Illegal instruction",
};

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + "\n... (truncated)" : text;
}

const output = { tests: [] };

if (job.compile) {
  const argv = command(job.compile);
  const r = spawnSync(argv[0], argv.slice(1), {
    cwd: work,
    env,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    timeout: 30000,
  });
  const ok = !r.error && r.status === 0;
  output.compile = { ok, output: clip((r.stdout || "") + (r.stderr || "") + (r.error ? String(r.error) : ""), MAX_STDERR) };
  if (!ok) {
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  }
}

const run = command(job.run);
for (const stdin of tests) {
  const start = process.hrtime.bigint();
  const r = spawnSync(run[0], run.slice(1), {
    cwd: work,
    env,
    input: stdin,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    timeout: job.timeLimitMs,
    killSignal: "SIGKILL",
  });
  const timeMs = Number((process.hrtime.bigint() - start) / 1000000n);
  let status = "ok";
  const code = r.error && r.error.code;
  if (code === "ETIMEDOUT") status = "time_limit";
  else if (code === "ENOBUFS") status = "output_limit";
  else if (r.error || r.status !== 0) status = "runtime_error";
  // Native programs that crash print nothing themselves.
  const signal = status === "runtime_error" && SIGNALS[r.signal] ? "\n" + SIGNALS[r.signal] : "";
  output.tests.push({
    status,
    stdout: status === "ok" ? r.stdout : "",
    stderr: clip((r.stderr || "") + (r.error && status === "runtime_error" ? String(r.error) : "") + signal, MAX_STDERR),
    timeMs,
    exitCode: r.status,
  });
  if (status !== "ok" && job.stopOnError) break;
}

process.stdout.write(JSON.stringify(output));
`;
