/**
 * Reads weekly challenge sets (weekly/<slug>/, decisions §15): set.json with
 * the title, the order sets start in and the problem slugs, and theme.md,
 * the set's introduction. The problems themselves are ordinary folders in
 * problems/. Shared by the check and seed scripts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { validate } from "convex-helpers/validators";
import { v, type Infer } from "convex/values";

import { listProblemDirs, loadProblem } from "./problems";

export const WEEKLY_DIR = "weekly";
const MIN_PROBLEMS = 3;
const MAX_PROBLEMS = 5;

const setFile = v.object({
  title: v.string(),
  order: v.number(),
  problems: v.array(v.string()),
});

export type WeeklySet = Infer<typeof setFile> & { slug: string; theme: string };

export function loadWeeklySets(): WeeklySet[] {
  if (!existsSync(WEEKLY_DIR)) return [];
  return readdirSync(WEEKLY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(WEEKLY_DIR, d.name);
      const json = JSON.parse(readFileSync(join(dir, "set.json"), "utf8"));
      if (!validate(setFile, json)) throw new Error(`${dir}/set.json doesn't match the set format`);
      const themeFile = join(dir, "theme.md");
      const theme = existsSync(themeFile) ? readFileSync(themeFile, "utf8").trim() : "";
      return { ...json, slug: d.name, theme };
    })
    .sort((a, b) => a.order - b.order);
}

/** Which set lists each problem slug. */
export function weeklySetOf(sets: WeeklySet[]) {
  const of = new Map<string, string>();
  for (const set of sets) for (const slug of set.problems) of.set(slug, set.slug);
  return of;
}

/** Everything wrong with the sets, as messages; empty when they're fine. */
export function checkWeeklySets(sets: WeeklySet[]): string[] {
  const errors: string[] = [];
  const problems = new Map(listProblemDirs().map((dir) => loadProblem(dir).meta).map((meta) => [meta.slug, meta]));
  const orders = new Map<number, string>();
  const listed = new Map<string, string>();
  for (const set of sets) {
    const name = `${WEEKLY_DIR}/${set.slug}`;
    if (!set.theme) errors.push(`${name}: theme.md is missing or empty`);
    if (set.problems.length < MIN_PROBLEMS || set.problems.length > MAX_PROBLEMS) {
      errors.push(`${name}: has ${set.problems.length} problems; a set has ${MIN_PROBLEMS} to ${MAX_PROBLEMS}`);
    }
    if (orders.has(set.order)) errors.push(`${name}: order ${set.order} is also ${orders.get(set.order)}'s`);
    orders.set(set.order, set.slug);
    for (const slug of set.problems) {
      const meta = problems.get(slug);
      if (!meta) errors.push(`${name}: no problem folder for ${slug}`);
      else if (meta.status === "draft") errors.push(`${name}: ${slug} is a draft`);
      if (listed.has(slug)) errors.push(`${name}: ${slug} is already in ${listed.get(slug)}`);
      listed.set(slug, set.slug);
    }
  }
  return errors;
}
