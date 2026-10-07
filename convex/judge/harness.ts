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
const { spawn, spawnSync } = require("child_process");
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

/** One process per test: full programs read their whole stdin. Returns false to stop. */
function runOne(stdin) {
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
  return status === "ok" || !job.stopOnError;
}

// Function mode, many tests per process (one JVM or runtime start, not one
// per test). stdin is the count, then each test as "<bytes>\n<input>". The
// driver answers each with "<microseconds> <bytes>\n<result>" on stdout, then
// MARKER on stderr, so every test keeps its own time (the call alone, not
// start-up) and its own printed output. A test that runs past its limit is
// killed by the timer, so an endless loop costs one limit, not the batch's.
const MARKER = "\u001eNJ\u001e\n";
// Room for start-up before the first result, and for reading and writing each test.
const STARTUP_GRACE_MS = 2000;
const RESULT_GRACE_MS = 500;
const MAX_BATCH_STDERR = 256 * 1024;

function frame(inputs) {
  const parts = [Buffer.from(inputs.length + "\n")];
  for (const input of inputs) {
    const bytes = Buffer.from(input, "utf8");
    parts.push(Buffer.from(bytes.length + "\n"), bytes);
  }
  return Buffer.concat(parts);
}

/** Runs one batch; resolves with whether every test in it passed the run (no crash or limit). */
function runBatch(inputs) {
  return new Promise((resolve) => {
    const child = spawn(run[0], run.slice(1), { cwd: work, env, stdio: ["pipe", "pipe", "pipe"] });
    const results = [];
    const errs = [];
    let out = Buffer.alloc(0);
    let err = "";
    let killedFor = null;
    let testStart = Date.now();
    let timer;
    const kill = (reason) => {
      if (!killedFor) killedFor = reason;
      child.kill("SIGKILL");
    };
    const arm = () => {
      clearTimeout(timer);
      const grace = results.length === 0 ? STARTUP_GRACE_MS : RESULT_GRACE_MS;
      timer = setTimeout(() => kill("time_limit"), job.timeLimitMs + grace);
    };
    arm();
    child.stdout.on("data", (chunk) => {
      out = Buffer.concat([out, chunk]);
      for (;;) {
        const nl = out.indexOf(10);
        if (nl < 0) break;
        const [micros, length] = out.subarray(0, nl).toString("latin1").split(" ").map(Number);
        if (!(length <= MAX_BUFFER)) return kill("output_limit");
        if (out.length < nl + 1 + length) break;
        results.push({ stdout: out.subarray(nl + 1, nl + 1 + length).toString("utf8"), timeMs: Math.round(micros / 1000) });
        out = out.subarray(nl + 1 + length);
        testStart = Date.now();
        if (micros / 1000 > job.timeLimitMs) return kill("time_limit");
        arm();
      }
      if (out.length > MAX_BUFFER + 64) kill("output_limit");
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString("utf8");
      for (let at = err.indexOf(MARKER); at >= 0; at = err.indexOf(MARKER)) {
        errs.push(err.slice(0, at));
        err = err.slice(at + MARKER.length);
      }
      if (err.length > MAX_BATCH_STDERR) err = err.slice(0, MAX_BATCH_STDERR);
    });
    child.stdin.on("error", () => {});
    child.stdin.end(frame(inputs));
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      for (const [i, result] of results.entries()) {
        // Answered, but slower than the limit.
        if (result.timeMs > job.timeLimitMs) {
          output.tests.push({ status: "time_limit", stdout: "", stderr: clip(errs[i] || "", MAX_STDERR), timeMs: result.timeMs, exitCode: null });
          return resolve(false);
        }
        output.tests.push({ status: "ok", stdout: result.stdout, stderr: clip(errs[i] || "", MAX_STDERR), timeMs: result.timeMs, exitCode: 0 });
      }
      if (results.length === inputs.length) return resolve(true);
      // The test in progress when the process ended: a crash, or killed above.
      const status = killedFor || "runtime_error";
      const crash = status === "runtime_error" && SIGNALS[signal] ? "\n" + SIGNALS[signal] : "";
      output.tests.push({
        status,
        stdout: "",
        stderr: clip((errs[results.length] ?? err) + crash, MAX_STDERR),
        timeMs: Date.now() - testStart,
        exitCode: code,
      });
      resolve(false);
    });
  });
}

async function main() {
  if (!job.batch) {
    for (const stdin of tests) if (!runOne(stdin)) break;
    return;
  }
  // The visible examples run apart from the hidden tests, so code that reads
  // ahead on stdin during an example (whose output is shown) never sees a
  // hidden input.
  const split = job.visible > 0 && job.visible < tests.length ? job.visible : tests.length;
  for (const group of [tests.slice(0, split), tests.slice(split)]) {
    if (group.length === 0) continue;
    if (!(await runBatch(group)) && job.stopOnError) break;
  }
}

main().then(() => process.stdout.write(JSON.stringify(output)));
`;
