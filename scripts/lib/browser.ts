/**
 * Runs the HTML and CSS judge (lib/web-judge.ts) in a headless browser for
 * `problems:check`. Uses an installed Chrome, then Edge, through
 * playwright-core, so nothing is downloaded: GitHub's Ubuntu runners have
 * Chrome, Windows has Edge. CHROME_PATH points at any other Chromium.
 */
import { chromium, type Browser } from "playwright-core";

import { judgeWebPage, pageSource, type WebFiles, type WebVerdict } from "../../lib/web-judge";
import type { WebJudge } from "../../convex/judge/types";

let browser: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errors: string[] = [];
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel });
    } catch (error) {
      errors.push(`${channel}: ${(error as Error).message.split("\n")[0]}`);
    }
  }
  throw new Error(`No browser for the HTML and CSS checks. Install Chrome or Edge, or set CHROME_PATH.\n${errors.join("\n")}`);
}

/** Judges one pair of files against the challenge, as the solve view would. */
export async function judgeInBrowser(judge: WebJudge, files: WebFiles): Promise<WebVerdict> {
  browser ??= launch();
  const page = await (await browser).newPage();
  try {
    await page.setContent("<!doctype html><html><body></body></html>");
    const args = {
      user: pageSource(files),
      target: pageSource(judge.target),
      checks: judge.checks,
      viewports: judge.viewports,
    };
    // tsx keeps function names with a `__name` helper, which the page doesn't have.
    return (await page.evaluate(
      `globalThis.__name = (f) => f; (${judgeWebPage.toString()})(${JSON.stringify(args)})`,
    )) as WebVerdict;
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browser) await (await browser).close();
  browser = null;
}
