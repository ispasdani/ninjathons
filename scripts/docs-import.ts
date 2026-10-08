/**
 * npm run docs:import [mdn|python] [-- --dry] [-- --prod]
 *
 * Builds the docs library (decisions §17) from the curated lists in
 * docs-library/: MDN pages at a pinned commit of github.com/mdn/content, and
 * Python's reference from the official plain-text archive. Downloads are
 * cached in .docs-cache/, so re-running is quick. Converts each page to
 * Markdown (scripts/lib/docs), then uploads the set to Convex, replacing the
 * previous import. --dry converts and reports without uploading.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { convertMdn, frontMatter, MDN_ORIGIN } from "./lib/docs/mdn";
import { anchorOf, convertPythonText, splitPython } from "./lib/docs/python";

const CACHE = ".docs-cache";
const args = process.argv.slice(2);
const prod = args.includes("--prod");
const dry = args.includes("--dry");
const only = args.filter((a) => !a.startsWith("--"));

type Area = "javascript" | "html" | "css" | "python";
type Page = {
  path: string;
  title: string;
  breadcrumb: string[];
  area: Area;
  body: string;
  sourceUrl: string;
  featured: boolean;
};
type SetUpload = { set: "mdn" | "python"; version: string; license: string; pages: Page[] };

const AREA_LABELS: Record<Area, string> = { javascript: "JavaScript", html: "HTML", css: "CSS", python: "Python" };

function cached(file: string) {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function save(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Runs tasks with at most `limit` at once. */
async function pool<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await run(items[i]);
      }
    }),
  );
  return results;
}

// --- MDN ---

type MdnConfig = { commit: string; license: string; areas: Record<"javascript" | "html" | "css", string[]>; featured: string[] };

/** The subpages of an MDN directory, from GitHub's contents API (cached per commit). */
async function mdnChildren(commit: string, dir: string): Promise<string[]> {
  const file = join(CACHE, "mdn", commit, "listing", `${dir.replace(/\//g, "__")}.json`);
  const hit = cached(file);
  if (hit) return JSON.parse(hit);
  const response = await fetch(`https://api.github.com/repos/mdn/content/contents/files/en-us/${dir}?ref=${commit}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "ninjathons-docs-import" },
  });
  if (!response.ok) throw new Error(`listing ${dir}: ${response.status} ${await response.text()}`);
  const entries = (await response.json()) as { type: string; name: string }[];
  const children = entries.filter((e) => e.type === "dir").map((e) => `${dir}/${e.name}`);
  save(file, JSON.stringify(children));
  return children;
}

async function mdnSource(commit: string, path: string): Promise<string | null> {
  const file = join(CACHE, "mdn", commit, "pages", `${path}.md`);
  const hit = cached(file);
  if (hit !== null) return hit;
  const response = await fetch(`https://raw.githubusercontent.com/mdn/content/${commit}/files/en-us/${path}/index.md`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const text = await response.text();
  save(file, text);
  return text;
}

async function buildMdn(): Promise<SetUpload> {
  const config = JSON.parse(readFileSync("docs-library/mdn.json", "utf8")) as MdnConfig;
  const wanted: { path: string; area: Area }[] = [];
  for (const [area, entries] of Object.entries(config.areas) as [Area, string[]][]) {
    for (const entry of entries) {
      if (entry.endsWith("/*")) {
        for (const child of await mdnChildren(config.commit, entry.slice(0, -2))) wanted.push({ path: child, area });
      } else {
        wanted.push({ path: entry, area });
      }
    }
  }
  const unique = [...new Map(wanted.map((w) => [w.path, w])).values()];
  const sources = await pool(unique, 8, async (w) => ({ ...w, source: await mdnSource(config.commit, w.path) }));
  const missing = sources.filter((s) => s.source === null).map((s) => s.path);
  if (missing.length) console.log(`  ! not on MDN at this commit, skipped: ${missing.join(", ")}`);

  const found = sources.filter((s) => s.source !== null).map((s) => {
    const { meta, markdown } = frontMatter(s.source!);
    return { ...s, meta, markdown };
  });
  const titles = new Map(found.map((f) => [f.path, f.meta["short-title"] || f.meta.title || f.path]));
  const imported = new Set(found.map((f) => f.path));
  const link = (path: string, hash: string) =>
    imported.has(path) ? `doc:mdn/${path}` : `${MDN_ORIGIN}/en-US/docs/${path}${hash ? `#${hash}` : ""}`;
  const featured = new Set(config.featured);

  const pages = found.map((f): Page => {
    const parent = f.path.split("/").slice(0, -1).join("/");
    return {
      path: f.path,
      title: f.meta.title || f.path,
      breadcrumb: [AREA_LABELS[f.area], ...(imported.has(parent) ? [titles.get(parent)!] : [])],
      area: f.area,
      body: convertMdn(f.markdown, link),
      sourceUrl: `${MDN_ORIGIN}/en-US/docs/${f.meta.slug || f.path}`,
      featured: featured.has(f.path),
    };
  });
  return { set: "mdn", version: `mdn/content@${config.commit.slice(0, 12)}`, license: config.license, pages };
}

// --- Python ---

type PythonConfig = {
  version: string;
  archive: string;
  license: string;
  files: { file: string; page: string; split: "whole" | "sections" | "entries"; skip?: string[]; featured: string[] }[];
};

async function pythonDocs(config: PythonConfig): Promise<string> {
  const dir = join(CACHE, "python", config.version);
  const root = join(dir, `python-${config.version}-docs-text`);
  if (existsSync(root)) return root;
  mkdirSync(dir, { recursive: true });
  const response = await fetch(config.archive);
  if (!response.ok) throw new Error(`Python archive: ${response.status}`);
  writeFileSync(join(dir, "docs.tar.bz2"), Buffer.from(await response.arrayBuffer()));
  const tar = spawnSync("tar", ["-xjf", "docs.tar.bz2"], { cwd: dir, encoding: "utf8" });
  if (tar.status !== 0) throw new Error(`tar failed: ${tar.stderr}`);
  return root;
}

const unquote = (text: string) => text.replace(/["`]/g, "");

async function buildPython(): Promise<SetUpload> {
  const config = JSON.parse(readFileSync("docs-library/python.json", "utf8")) as PythonConfig;
  const root = await pythonDocs(config);
  const pages: Page[] = [];
  for (const entry of config.files) {
    const markdown = convertPythonText(readFileSync(join(root, entry.file), "utf8"));
    const pageTitle = unquote(markdown.match(/^# (.*)$/m)?.[1].trim() ?? entry.page);
    const crumb = pageTitle.replace(/ — .*$/, "");
    const htmlUrl = `https://docs.python.org/${config.version}/${entry.page}.html`;
    const skip = (entry.skip ?? []).map(unquote);
    for (const part of splitPython(markdown, entry.split)) {
      const title = unquote(part.title);
      if (skip.includes(title)) continue;
      pages.push({
        path: part.slug ? `${entry.page}/${part.slug}` : entry.page,
        title,
        breadcrumb: entry.split === "whole" || !part.slug ? ["Python"] : ["Python", crumb],
        area: "python",
        body: part.body,
        sourceUrl: part.slug ? `${htmlUrl}#${entry.split === "entries" ? part.heading : anchorOf(title)}` : htmlUrl,
        featured: entry.featured.includes("*") || entry.featured.map(unquote).includes(title),
      });
    }
  }
  return { set: "python", version: `Python ${config.version}`, license: config.license, pages };
}

// --- Upload ---

function convexRun(fn: string, fnArgs: object): unknown {
  const result = spawnSync(
    process.execPath,
    ["node_modules/convex/bin/main.js", "run", fn, JSON.stringify(fnArgs), ...(prod ? ["--prod"] : [])],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`convex run ${fn} failed:\n${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}

async function upload(set: SetUpload) {
  const uploadUrl = convexRun("problems:generateUploadUrl", {}) as string;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(set),
  });
  if (!response.ok) throw new Error(`upload failed: ${response.status} ${await response.text()}`);
  const { storageId } = (await response.json()) as { storageId: string };
  return convexRun("docs:seedFromUpload", { upload: storageId }) as { written: number; removed: number };
}

async function main() {
  const builders = { mdn: buildMdn, python: buildPython };
  const sets = (only.length ? only : Object.keys(builders)) as (keyof typeof builders)[];
  let failed = false;
  for (const name of sets) {
    try {
      console.log(`${name}: building`);
      const set = await builders[name]();
      const bytes = set.pages.reduce((n, p) => n + p.body.length, 0);
      const byArea = new Map<string, number>();
      for (const p of set.pages) byArea.set(p.area, (byArea.get(p.area) ?? 0) + 1);
      console.log(
        `  ${set.pages.length} pages (${[...byArea].map(([a, n]) => `${n} ${a}`).join(", ")}), ${Math.round(bytes / 1024)} KB, ${set.pages.filter((p) => p.featured).length} featured`,
      );
      const empty = set.pages.filter((p) => p.body.length < 100).map((p) => p.path);
      if (empty.length) console.log(`  ! nearly empty: ${empty.join(", ")}`);
      save(join(CACHE, "out", `${name}.json`), JSON.stringify(set, null, 2));
      if (dry) continue;
      const result = await upload(set);
      console.log(`  ✓ uploaded to the ${prod ? "PRODUCTION" : "dev"} deployment: ${result.written} written, ${result.removed} removed`);
    } catch (error) {
      failed = true;
      console.log(`  ✗ ${name}: ${(error as Error).message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

void main();
