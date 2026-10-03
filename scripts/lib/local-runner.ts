/**
 * Runs jobs on this computer with the installed Node.js and Python, through the
 * same harness Vercel Sandbox runs. For problems:check and tests only: it
 * doesn't isolate anything, so it must never run code from users.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { HARNESS_FILE, HARNESS_SOURCE, JOB_FILE } from "../../convex/judge/harness";
import type { CodeRunner, RunJob, RunOutput } from "../../convex/judge/types";

// Windows installs Python as `python`, not `python3`.
function localCommand(argv: string[]): string[] {
  if (process.platform === "win32" && argv[0] === "python3") return ["python", ...argv.slice(1)];
  return argv;
}

export const localRunner: CodeRunner = {
  async run(job: RunJob): Promise<RunOutput> {
    const dir = mkdtempSync(join(tmpdir(), "ninjathons-run-"));
    try {
      for (const [path, content] of Object.entries(job.files)) {
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(join(dir, path), content);
      }
      writeFileSync(join(dir, HARNESS_FILE), HARNESS_SOURCE);
      const localJob = {
        ...job,
        compile: job.compile && localCommand(job.compile),
        run: localCommand(job.run),
      };
      writeFileSync(join(dir, JOB_FILE), JSON.stringify(localJob));
      const result = spawnSync(process.execPath, [HARNESS_FILE, JOB_FILE], {
        cwd: dir,
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      });
      if (result.status !== 0) {
        throw new Error(`harness failed: ${result.stderr || result.error}`);
      }
      return JSON.parse(result.stdout) as RunOutput;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
};
