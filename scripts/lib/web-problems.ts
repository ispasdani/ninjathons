/**
 * HTML and CSS challenges (decisions §17): problem folders with
 * `"mode": "web"`. Besides problem.json, statement.md and hints.md:
 *
 *   web/target.html, web/target.css     the page to match
 *   web/starter.html, web/starter.css   what the player starts from
 *   web/checks.json                     what's compared (schemas/problems.ts, webCheck)
 *   solutions/reference.{html,css}      must pass
 *   solutions/wrong-*.{html,css}        must fail (at least one)
 *
 * A solution's missing file is the starter's. The checks run in a headless
 * Chrome or Edge (scripts/lib/browser.ts) with the same judge as the solve view.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { validate } from "convex-helpers/validators";
import { v, type Infer } from "convex/values";

import type { WebJudge } from "../../convex/judge/types";
import { difficulty, webCheck } from "../../convex/schemas/problems";
import type { WebFiles } from "../../lib/web-judge";

const webProblemFile = v.object({
  slug: v.string(),
  title: v.string(),
  difficulty,
  tags: v.array(v.string()),
  mode: v.literal("web"),
  // Which files the player edits; the others are given.
  edit: v.array(v.union(v.literal("html"), v.literal("css"))),
  // Widths the pages are compared at; 800 when left out.
  viewports: v.optional(v.array(v.number())),
  status: v.union(v.literal("draft"), v.literal("beta"), v.literal("approved")),
  version: v.number(),
});
export type WebProblemFile = Infer<typeof webProblemFile>;

export type WebSolution = { name: string; kind: "reference" | "wrong"; files: WebFiles };

export type WebProblem = {
  dir: string;
  meta: WebProblemFile;
  judge: WebJudge;
  statement: string;
  hints: string[];
  solutions: WebSolution[];
};

const DEFAULT_VIEWPORTS = [800];

function read(path: string, fallback?: string) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${path} is missing`);
  }
  return readFileSync(path, "utf8");
}

function readHints(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/^## Hint[^\n]*\n/m)
    .slice(1)
    .map((h) => h.trim())
    .filter(Boolean);
}

/** Whether a problem folder is an HTML and CSS challenge. */
export function isWebProblemDir(dir: string) {
  const json = JSON.parse(readFileSync(join(dir, "problem.json"), "utf8")) as { mode?: string };
  return json.mode === "web";
}

export function loadWebProblem(dir: string): WebProblem {
  const raw = JSON.parse(readFileSync(join(dir, "problem.json"), "utf8"));
  if (!validate(webProblemFile, raw, { throw: true })) throw new Error("invalid problem.json");
  const meta: WebProblemFile = raw;
  if (meta.slug !== basename(dir)) throw new Error(`slug "${meta.slug}" should match the folder name`);

  const web = join(dir, "web");
  const files = (name: string): WebFiles => ({
    html: read(join(web, `${name}.html`)),
    css: read(join(web, `${name}.css`), ""),
  });
  const target = files("target");
  const starter = files("starter");
  const checks = JSON.parse(read(join(web, "checks.json")));
  if (!validate(v.array(webCheck), checks)) throw new Error(`${web}/checks.json doesn't match the check format`);

  // Solutions by name: reference.html and reference.css are one solution.
  const solutionsDir = join(dir, "solutions");
  const byName = new Map<string, Partial<WebFiles>>();
  if (existsSync(solutionsDir)) {
    for (const file of readdirSync(solutionsDir)) {
      const ext = extname(file).slice(1);
      if (ext !== "html" && ext !== "css") continue;
      const name = basename(file, extname(file));
      byName.set(name, { ...byName.get(name), [ext]: readFileSync(join(solutionsDir, file), "utf8") });
    }
  }
  const solutions: WebSolution[] = [];
  for (const [name, partial] of byName) {
    const kind = name === "reference" ? "reference" : name.startsWith("wrong-") ? "wrong" : null;
    if (kind) solutions.push({ name, kind, files: { ...starter, ...partial } });
  }

  return {
    dir,
    meta,
    judge: {
      mode: "web",
      edit: meta.edit,
      target,
      starter,
      checks,
      viewports: meta.viewports ?? DEFAULT_VIEWPORTS,
    },
    statement: read(join(dir, "statement.md")).trim(),
    hints: readHints(join(dir, "hints.md")),
    solutions,
  };
}
