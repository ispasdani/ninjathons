/**
 * The program every runner executes as `node harness.cjs job.json`, inside
 * Vercel Sandbox or in a temporary folder locally. It compiles once, runs each
 * test with its stdin and a time limit, and prints a RunOutput as JSON. It
 * never sees expected outputs, so it can't decide verdicts.
 *
 * Plain CommonJS with no dependencies, kept as a string so Convex can upload it.
 */
export const HARNESS_FILE = "harness.cjs";
export const JOB_FILE = "job.json";

export const HARNESS_SOURCE = String.raw`"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");

const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const MAX_BUFFER = 16 * 1024 * 1024;
const MAX_STDERR = 8 * 1024;

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + "\n... (truncated)" : text;
}

const output = { tests: [] };

if (job.compile) {
  const r = spawnSync(job.compile[0], job.compile.slice(1), {
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

for (const stdin of job.tests) {
  const start = process.hrtime.bigint();
  const r = spawnSync(job.run[0], job.run.slice(1), {
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
  output.tests.push({
    status,
    stdout: status === "ok" ? r.stdout : "",
    stderr: clip((r.stderr || "") + (r.error && status === "runtime_error" ? String(r.error) : ""), MAX_STDERR),
    timeMs,
    exitCode: r.status,
  });
  if (status !== "ok" && job.stopOnError) break;
}

process.stdout.write(JSON.stringify(output));
`;
