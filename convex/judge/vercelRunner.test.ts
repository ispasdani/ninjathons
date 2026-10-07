// @vitest-environment node
// Waiting out Vercel's sandbox limits, with the SDK replaced by a fake.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@vercel/sandbox", () => ({ Sandbox: { create: (...args: unknown[]) => create(...args) } }));

import { vercelRunner } from "./vercelRunner";

const rateLimited = () => new Error("Status code 429 is not ok: vCPUs allocation rate limit exceeded (31 vCPUs/min).");

/** A sandbox whose harness answers with no tests run. */
function fakeSandbox() {
  return {
    writeFiles: vi.fn(async () => {}),
    runCommand: vi.fn(async () => ({ exitCode: 0, stdout: async () => '{"tests":[]}', stderr: async () => "" })),
    stop: vi.fn(async () => {}),
  };
}

const job = { files: {}, run: ["true"], tests: [], timeLimitMs: 1000, stopOnError: true, image: "managed" as const };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("VERCEL_TOKEN", "t");
  vi.stubEnv("VERCEL_TEAM_ID", "team");
  vi.stubEnv("VERCEL_PROJECT_ID", "project");
  create.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("vercelRunner", () => {
  it("waits out the rate limit, telling the caller when the wait starts and ends", async () => {
    create.mockRejectedValueOnce(rateLimited()).mockRejectedValueOnce(rateLimited()).mockResolvedValue(fakeSandbox());
    const waits: boolean[] = [];
    const runner = vercelRunner({ onWait: async (waiting) => void waits.push(waiting) });
    const running = runner.run(job);
    await vi.runAllTimersAsync();
    await expect(running).resolves.toEqual({ tests: [] });
    expect(create).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([true, false]);
  });

  it("starts on 1 vCPU unless SANDBOX_VCPUS says otherwise", async () => {
    create.mockResolvedValue(fakeSandbox());
    await vercelRunner().run(job);
    expect(create.mock.calls[0][0].resources).toEqual({ vcpus: 1 });
  });

  it("fails at once on any other error", async () => {
    create.mockRejectedValue(new Error("Status code 400 is not ok: bad image"));
    const waits: boolean[] = [];
    await expect(vercelRunner({ onWait: async (w) => void waits.push(w) }).run(job)).rejects.toThrow("bad image");
    expect(create).toHaveBeenCalledTimes(1);
    expect(waits).toEqual([]);
  });

  it("gives up after 90 s of limits", async () => {
    create.mockRejectedValue(rateLimited());
    const running = vercelRunner().run(job);
    const settled = expect(running).rejects.toThrow("429");
    await vi.advanceTimersByTimeAsync(91_000);
    await settled;
  });
});
