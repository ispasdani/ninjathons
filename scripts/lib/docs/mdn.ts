/**
 * MDN pages (github.com/mdn/content, prose CC-BY-SA 2.5, code samples CC0)
 * converted for the docs library (decisions §17). MDN's Markdown is mostly
 * GFM plus KumaScript macros ({{jsxref("Array")}}), definition lists
 * ("- term" then "  - : description") and live-sample machinery. The
 * conversion keeps the prose and examples, turns cross-reference macros into
 * links, and drops what only works on MDN itself (live samples, compatibility
 * tables, the formal syntax boxes).
 */

export const MDN_ORIGIN = "https://developer.mozilla.org";

export type MdnPage = { path: string; title: string; shortTitle?: string; body: string };

/** Splits the YAML front matter from the Markdown. Only the simple `key: value` lines MDN uses. */
export function frontMatter(source: string): { meta: Record<string, string>; markdown: string } {
  const match = source.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, markdown: source };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { meta, markdown: source.slice(match[0].length) };
}

/** A macro's arguments: `"Array/map", "map()"` → ["Array/map", "map()"]. */
function macroArgs(raw: string | undefined): string[] {
  if (!raw) return [];
  const args: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^,\s][^,]*)/g;
  for (const m of raw.matchAll(re)) args.push((m[1] ?? m[2] ?? m[3] ?? "").trim());
  return args;
}

function decodeEntities(text: string) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

/** The MDN path a cross-reference macro points at, without /en-US/docs/. */
function macroTarget(name: string, args: string[]): { path: string; text: string; code: boolean } | null {
  const [first = "", second] = args;
  const plain = decodeEntities(first);
  switch (name) {
    case "jsxref": {
      // jsxref("Array.prototype.map()") and jsxref("Array/map", "map()").
      const target = plain.replace(/\.prototype\./, "/").replace(/\(\)$/, "").replace(/\./g, "/");
      const path = /^(Statements|Operators|Functions|Errors|Lexical_grammar|Template_literals)\//.test(target)
        ? `Web/JavaScript/Reference/${target}`
        : `Web/JavaScript/Reference/Global_Objects/${target}`;
      return { path, text: second ?? plain, code: true };
    }
    case "cssxref": {
      const target = plain.replace(/^<|>$/g, "").replace(/\(\)$/, "");
      return { path: `Web/CSS/Reference/Properties/${target}`, text: second ?? plain, code: true };
    }
    case "htmlelement": {
      const target = plain.replace(/^input\//, "input/");
      return { path: `Web/HTML/Reference/Elements/${target}`, text: second ?? `<${plain.split("/")[0]}>`, code: true };
    }
    case "htmlattrxref":
      return { path: `Web/HTML/Reference/Attributes/${plain}`, text: plain, code: true };
    case "domxref":
      return { path: `Web/API/${plain.replace(/\.prototype\./, "/").replace(/\(\)$/, "").replace(/\./g, "/")}`, text: second ?? plain, code: true };
    case "glossary":
      return { path: `Glossary/${plain.replace(/ /g, "_")}`, text: second ?? plain, code: false };
    case "httpheader":
      return { path: `Web/HTTP/Reference/Headers/${plain}`, text: second ?? plain, code: true };
    default:
      return null;
  }
}

const INLINE_BADGES: Record<string, string> = {
  optional_inline: "(optional)",
  deprecated_inline: "(deprecated)",
  experimental_inline: "(experimental)",
  "non-standard_inline": "(non-standard)",
  readonlyinline: "(read-only)",
};

// Sections that only make sense on MDN: compatibility tables and specification links.
const DROPPED_SECTIONS = /^(Specifications|Browser compatibility|Formal definition|Formal syntax)$/i;

/** One MDN page's Markdown, cleaned up. `link` maps an MDN path to the URL the library uses for it. */
export function convertMdn(markdown: string, link: (mdnPath: string, hash: string) => string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let fence: { keep: boolean } | null = null;
  let dropping = 0; // the heading level of a dropped section, 0 when not dropping

  for (const line of lines) {
    // Code fences: keep the language, drop the live-sample blocks hidden on MDN.
    const fenceLine = line.match(/^(\s*)```(.*)$/);
    if (fenceLine) {
      if (!fence) {
        const info = fenceLine[2].trim().split(/\s+/);
        // Hidden live-sample code, and the CSS and HTML scaffolding of MDN's interactive
        // demos, only work on MDN; JavaScript demos are plain runnable examples.
        const demo = info.some((x) => x.startsWith("interactive-example")) && !/^js/.test(info[0] ?? "");
        const hidden = info.includes("hidden") || demo;
        const lang = (info[0] ?? "").replace(/-nolint$/, "");
        const language = { js: "javascript", plain: "text", "": "text" }[lang] ?? lang;
        fence = { keep: !hidden && !dropping };
        if (fence.keep) out.push(`${fenceLine[1]}\`\`\`${language}`);
      } else {
        if (fence.keep) out.push(line);
        fence = null;
      }
      continue;
    }
    if (fence) {
      if (fence.keep) out.push(line);
      continue;
    }

    const heading = line.match(/^(#{2,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      if (dropping && level <= dropping) dropping = 0;
      if (!dropping && DROPPED_SECTIONS.test(heading[2].trim())) {
        dropping = level;
        continue;
      }
    }
    if (dropping) continue;

    out.push(line);
  }

  let text = out.join("\n");

  // Macros.
  text = text.replace(/\{\{\s*([\w-]+)\s*(?:\(([\s\S]*?)\))?\s*\}\}/g, (_, rawName: string, rawArgs?: string) => {
    const name = rawName.toLowerCase();
    if (INLINE_BADGES[name]) return `*${INLINE_BADGES[name]}*`;
    const target = macroTarget(name, macroArgs(rawArgs));
    if (!target) return "";
    const label = target.code ? `\`${decodeEntities(target.text)}\`` : decodeEntities(target.text);
    return `[${label}](${link(target.path.toLowerCase(), "")})`;
  });

  // Links to other MDN pages.
  text = text.replace(/\]\((\/en-US\/docs\/[^)\s]+)\)/g, (_, url: string) => {
    const [path, hash = ""] = url.replace(/^\/en-US\/docs\//, "").split("#");
    return `](${link(path.toLowerCase(), hash)})`;
  });

  // Definition lists: "- `term`" then "  - : description" becomes "- `term`: description".
  const merged: string[] = [];
  for (const line of text.split("\n")) {
    const desc = line.match(/^(\s*)- : (.*)$/);
    const prev = merged[merged.length - 1];
    const term = prev?.match(/^(\s*)- (.*)$/);
    if (desc && term && desc[1].length === term[1].length + 2) {
      merged[merged.length - 1] = `${term[1]}- ${term[2]}: ${desc[2]}`;
    } else {
      merged.push(line);
    }
  }
  text = merged.join("\n");

  // GitHub-style callouts read better as a bold label.
  text = text.replace(
    /^(\s*)> \[!(\w+)\]\s*$/gm,
    (_, indent: string, kind: string) => `${indent}> **${kind[0].toUpperCase()}${kind.slice(1).toLowerCase()}:**`,
  );

  // Collapse the blank lines left by removed macros and sections.
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
