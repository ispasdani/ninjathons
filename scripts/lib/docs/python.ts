/**
 * Python's reference (docs.python.org, PSF License) converted for the docs
 * library (decisions §17). The source is Sphinx's plain-text build, from the
 * official "docs-text" archive: headings underlined with * = - ~ ^, API
 * entries as a signature line followed by a body indented three spaces, and
 * code after a line ending in a colon (Sphinx prints "::" as ":") or starting
 * with ">>>". This turns
 * that into Markdown and splits it into pages.
 */

const UNDERLINES: Record<string, number> = { "*": 1, "=": 2, "-": 3, "~": 4, "^": 5, '"': 5 };

// An API entry's first line: "heapq.heappush(heap, item)", "class collections.deque([iterable[, maxlen]])",
// "list.sort(*, key=None, reverse=False)", "math.pi", "@staticmethod".
const SIGNATURE = /^@?(?:(?:class|exception|async|await|abstractmethod|classmethod|staticmethod)\s+)*[A-Za-z_][\w.]*(?:\[[^\]]*\])?(?:\(.*\))?(?:\s*->\s*\S.*)?$/;

function indentOf(line: string) {
  return line.length - line.trimStart().length;
}

function isUnderline(line: string, above: string) {
  const t = line.trimEnd();
  return t.length > 0 && /^([*=\-~^"])\1*$/.test(t) && above.trim().length > 0 && t.length >= above.trimEnd().length && indentOf(above) === 0;
}

/** One text page as Markdown, with headings at their levels and API entries as `####` headings. */
export function convertPythonText(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const bases: number[] = [0]; // indentation of the API entries we're inside
  // The last line of prose read, for spotting the code block after "…:".
  let prose = { text: "", indent: 0 };
  let i = 0;

  const base = () => bases[bases.length - 1];
  const emit = (line: string) => out.push(line);

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";
    const blank = line.trim() === "";
    const indent = indentOf(line);

    // Leaving an API entry's body.
    if (!blank) while (bases.length > 1 && indent < base()) bases.pop();

    // A heading: text with an underline below it.
    if (!blank && indent === 0 && isUnderline(next, line)) {
      const level = UNDERLINES[next.trim()[0]] ?? 5;
      bases.length = 1;
      emit("");
      emit(`${"#".repeat(Math.min(level, 4))} ${line.trim()}`);
      emit("");
      i += 2;
      continue;
    }
    // A rule on its own.
    if (!blank && /^(=|-|\*){10,}$/.test(line.trim())) {
      emit("");
      emit("---");
      emit("");
      i++;
      continue;
    }

    // Code after a line ending in a colon (Sphinx prints "::" as ":") and
    // indented three more, an interactive session, or a grid table.
    const startsSession = line.trimStart().startsWith(">>>");
    const startsTable = /^\s*\+[-=+]+\+\s*$/.test(line);
    const afterColons =
      !blank && (lines[i - 1] ?? "").trim() === "" && /:\s*$/.test(prose.text) && indent >= prose.indent + 3;
    if (startsSession || startsTable || afterColons) {
      const codeIndent = indent;
      const block: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === "") {
          // A blank line ends a session or table; code after "::" can contain blank lines.
          const after = lines.slice(i + 1).find((x) => x.trim() !== "");
          if (startsSession || startsTable || !after || indentOf(after) < codeIndent) break;
          block.push("");
          i++;
          continue;
        }
        if (indentOf(l) < codeIndent) break;
        block.push(l.slice(codeIndent));
        i++;
      }
      prose = { text: "", indent: 0 };
      emit("");
      emit(startsTable ? "```text" : "```python");
      for (const l of block) emit(l);
      emit("```");
      emit("");
      continue;
    }

    // An API entry: a signature, a blank line, then a body indented three more.
    if (!blank && indent === base() && SIGNATURE.test(line.trim()) && next.trim() === "") {
      const body = lines.slice(i + 2).find((x) => x.trim() !== "");
      if (body && indentOf(body) === indent + 3) {
        emit("");
        emit(`${bases.length > 1 ? "#####" : "####"} \`${line.trim()}\``);
        emit("");
        bases.push(indent + 3);
        i += 2;
        continue;
      }
    }

    if (!blank) prose = { text: line.trimEnd(), indent };
    emit(blank ? "" : line.slice(Math.min(indent, base())).replace(/^ {1,3}(?=\S)/, ""));
    i++;
  }
  // Sphinx writes an em dash as three hyphens.
  return codeQuotes(out.join("\n").replace(/ --- /g, " — ").replace(/\n{3,}/g, "\n\n").trim());
}

/**
 * The text build marks code with double quotes ("heap[2*k+1]"), which
 * Markdown would read as emphasis. Quoted spans that look like code (no
 * spaces, or code characters) become inline code; quoted prose stays.
 * Code blocks are left alone.
 */
function codeQuotes(markdown: string) {
  return markdown
    .split(/(^```[\s\S]*?^```)/m)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/"((?:[^"\n]|\n(?![ \t]*\n)){1,120}?)"/g, (whole, inner: string) =>
            !/\s/.test(inner) || /[()[\]{}=<>*_.+\-/%]/.test(inner) ? `\`${inner.replace(/\s*\n\s*/g, " ")}\`` : whole,
          ),
    )
    .join("");
}

/** Sphinx-style anchor for a heading, close enough to link to the right section. */
export function anchorOf(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[`"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type PythonPage = { slug: string; title: string; heading?: string; body: string };

/**
 * Splits a converted page. "sections": one page per `##` section (the
 * intro before the first becomes its own page when it has text). "entries":
 * one page per `####` API entry, for the built-in functions. "whole": one page.
 */
export function splitPython(markdown: string, how: "whole" | "sections" | "entries", skip: string[] = []): PythonPage[] {
  const title = markdown.match(/^# (.*)$/m)?.[1].trim() ?? "";
  if (how === "whole") return [{ slug: "", title, body: markdown.replace(/^# .*\n/m, "").trim() }];

  const marker = how === "sections" ? /^## (.*)$/ : /^#### `(.*)`$/;
  const pages: PythonPage[] = [];
  let current: PythonPage | null = null;
  const intro: string[] = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(marker);
    if (m) {
      if (current) pages.push(current);
      const heading = m[1].trim();
      const name = how === "entries" ? heading.replace(/^@/, "").replace(/^class\s+/, "").replace(/\(.*$/, "") : heading;
      current = { slug: anchorOf(name), title: how === "entries" ? `${name}()`.replace(/\(\)\(\)$/, "()") : heading, heading: name, body: "" };
      if (how === "entries") current.body = `\`\`\`python\n${heading}\n\`\`\`\n`;
      continue;
    }
    if (current) current.body += line + "\n";
    else if (!/^# /.test(line)) intro.push(line);
  }
  if (current) pages.push(current);
  for (const page of pages) page.body = page.body.replace(/\n{3,}/g, "\n\n").trim();
  const introText = intro.join("\n").trim();
  if (how === "sections" && introText.length > 200) pages.unshift({ slug: "", title, body: introText });
  return pages.filter((p) => !skip.includes(p.title));
}
