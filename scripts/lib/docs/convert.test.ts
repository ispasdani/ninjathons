// @vitest-environment node
// The docs library's converters (decisions §17): MDN Markdown and Python's
// plain-text docs into the Markdown the docs panel shows.
import { describe, expect, it } from "vitest";

import { convertMdn, frontMatter } from "./mdn";
import { convertPythonText, splitPython } from "./python";

const link = (path: string, hash: string) => (path.endsWith("array") ? `doc:mdn/${path}` : `https://mdn/${path}${hash ? `#${hash}` : ""}`);

describe("MDN pages", () => {
  it("reads the front matter", () => {
    const { meta, markdown } = frontMatter("---\ntitle: Array.prototype.map()\nslug: Web/X\n---\n\nBody");
    expect(meta).toEqual({ title: "Array.prototype.map()", slug: "Web/X" });
    expect(markdown.trim()).toBe("Body");
  });

  it("turns cross-reference macros into links, inside the library when the page is there", () => {
    const out = convertMdn('Use {{jsxref("Array")}} or {{jsxref("Array/forEach", "forEach")}} and {{cssxref("display")}}.', link);
    expect(out).toBe(
      "Use [`Array`](doc:mdn/web/javascript/reference/global_objects/array) or [`forEach`](https://mdn/web/javascript/reference/global_objects/array/foreach) and [`display`](https://mdn/web/css/reference/properties/display).",
    );
    expect(convertMdn('[the docs](/en-US/docs/Web/CSS/Guides/Flex#basics)', link)).toBe("[the docs](https://mdn/web/css/guides/flex#basics)");
  });

  it("drops live samples, compatibility sections and other macros, and keeps the badges", () => {
    const source = [
      "Intro {{optional_inline}}",
      "",
      "{{InteractiveExample(\"Demo\")}}",
      "",
      "```html hidden",
      "<div>scaffolding</div>",
      "```",
      "",
      "```js-nolint",
      "map(fn)",
      "```",
      "",
      "## Specifications",
      "",
      "{{Specifications}}",
      "",
      "## Browser compatibility",
      "",
      "{{Compat}}",
      "",
      "## See also",
      "",
      "- Nothing",
    ].join("\n");
    expect(convertMdn(source, link)).toBe("Intro *(optional)*\n\n```javascript\nmap(fn)\n```\n\n## See also\n\n- Nothing");
  });

  it("joins definition lists onto their terms and turns callouts into labels", () => {
    const source = "- `callbackFn`\n  - : A function.\n    - `element`\n      - : The element.\n\n> [!NOTE]\n> Careful.";
    expect(convertMdn(source, link)).toBe("- `callbackFn`: A function.\n    - `element`: The element.\n\n> **Note:**\n> Careful.");
  });
});

describe("Python's text docs", () => {
  const source = [
    '"heapq" --- Heap queue algorithm',
    "********************************",
    "",
    "Intro text.",
    "",
    "heapq.heappush(heap, item)",
    "",
    "   Push the value onto the heap.",
    "",
    "   For example:",
    "",
    "      heappush(h, 1)",
    "      heappush(h, 2)",
    "",
    "Basic Examples",
    "==============",
    "",
    ">>> import heapq",
    ">>> heapq.nsmallest(2, [5, 1, 3])",
    "[1, 3]",
    "",
    "Done.",
  ].join("\n");

  it("turns headings, API entries and code into Markdown", () => {
    expect(convertPythonText(source)).toBe(
      [
        "# `heapq` — Heap queue algorithm",
        "",
        "Intro text.",
        "",
        "#### `heapq.heappush(heap, item)`",
        "",
        "Push the value onto the heap.",
        "",
        "For example:",
        "",
        "```python",
        "heappush(h, 1)",
        "heappush(h, 2)",
        "```",
        "",
        "## Basic Examples",
        "",
        "```python",
        ">>> import heapq",
        ">>> heapq.nsmallest(2, [5, 1, 3])",
        "[1, 3]",
        "```",
        "",
        "Done.",
      ].join("\n"),
    );
  });

  it("splits into one page per section or per API entry", () => {
    const markdown = convertPythonText(source);
    expect(splitPython(markdown, "sections").map((p) => [p.slug, p.title])).toEqual([["basic-examples", "Basic Examples"]]);
    const entries = splitPython(markdown, "entries");
    expect(entries.map((p) => [p.slug, p.title])).toEqual([["heapq-heappush", "heapq.heappush()"]]);
    expect(entries[0].body.startsWith("```python\nheapq.heappush(heap, item)\n```")).toBe(true);
  });
});
