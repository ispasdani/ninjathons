/**
 * The HTML and CSS judge (decisions §17): renders the player's page and the
 * target in sandboxed iframes at each viewport width and compares them,
 * check by check. Runs in the solve view, and in `problems:check` through a
 * headless browser, which is why `judgeWebPage` is one self-contained
 * function: the script sends its source to the browser as text.
 *
 * Scripts never run in either page: the iframes are sandboxed without
 * allow-scripts. allow-same-origin only lets this page read their layout.
 */
import type { WebJudge } from "@/convex/judge/types";

export type WebFiles = { html: string; css: string };
export type WebCheck = WebJudge["checks"][number];

export type WebCheckResult = {
  selector: string;
  viewport: number;
  ok: boolean;
  // Why it failed, for the player: the first difference found.
  message?: string;
};

export type WebVerdict = { passed: number; total: number; results: WebCheckResult[] };

/** The page a pair of files makes: the CSS goes in the head, whether the HTML is a whole document or a fragment. */
export function pageSource({ html, css }: WebFiles) {
  const style = `<style>\n${css}\n</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`);
  if (/<html[\s>]/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head>${style}</head>`);
  return `<!doctype html>\n<html><head><meta charset="utf-8">${style}</head><body>\n${html}\n</body></html>`;
}

/**
 * Renders both pages in hidden iframes in the current document and runs every
 * check at every viewport width. Self-contained: no imports, no outside names.
 */
export async function judgeWebPage(args: {
  user: string; // page sources, from pageSource
  target: string;
  checks: WebCheck[];
  viewports: number[];
}): Promise<WebVerdict> {
  const HEIGHT = 800;
  const DEFAULT_TOLERANCE = 4;

  function frame(source: string, width: number) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${HEIGHT}px;border:0;visibility:hidden`;
    const loaded = new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
    });
    iframe.srcdoc = source;
    document.body.appendChild(iframe);
    return loaded.then(() => iframe);
  }

  function nth(i: number) {
    const n = i + 1;
    const suffix = n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th";
    return `${n}${suffix}`;
  }

  function query(doc: Document, selector: string) {
    try {
      return Array.from(doc.querySelectorAll(selector));
    } catch {
      return null;
    }
  }

  function text(el: Element) {
    return (el.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function compare(user: Document, target: Document, check: WebCheck): string | undefined {
    const mine = query(user, check.selector);
    const theirs = query(target, check.selector);
    if (!mine || !theirs) return `"${check.selector}" isn't a valid selector`;
    if (mine.length !== theirs.length) {
      const found = mine.length === 0 ? "nothing matches" : `${mine.length} match`;
      return `${check.selector}: ${found}; the target has ${theirs.length}`;
    }
    const tolerance = check.tolerance ?? DEFAULT_TOLERANCE;
    for (let i = 0; i < theirs.length; i++) {
      const a = mine[i];
      const b = theirs[i];
      const which = theirs.length > 1 ? `${check.selector} (${nth(i)})` : check.selector;
      if (check.text && text(a) !== text(b)) return `${which}: the text is "${text(a)}"; the target's is "${text(b)}"`;
      if (check.styles?.length) {
        const sa = user.defaultView!.getComputedStyle(a);
        const sb = target.defaultView!.getComputedStyle(b);
        // How the browser reports "no colour" reads better as a word.
        const shown = (value: string) => (value === "rgba(0, 0, 0, 0)" ? "transparent" : value || "(not set)");
        for (const property of check.styles) {
          const va = sa.getPropertyValue(property);
          const vb = sb.getPropertyValue(property);
          if (va !== vb) return `${which}: ${property} is ${shown(va)}; the target's is ${shown(vb)}`;
        }
      }
      if (check.box) {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const off = [ra.x - rb.x, ra.y - rb.y, ra.width - rb.width, ra.height - rb.height].some(
          (d) => Math.abs(d) > tolerance,
        );
        if (off) {
          const box = (r: DOMRect) => `${Math.round(r.width)}×${Math.round(r.height)} at (${Math.round(r.x)}, ${Math.round(r.y)})`;
          return `${which}: ${box(ra)}; the target's is ${box(rb)}`;
        }
      }
    }
    return undefined;
  }

  const results: WebCheckResult[] = [];
  for (const viewport of args.viewports) {
    const [user, target] = await Promise.all([frame(args.user, viewport), frame(args.target, viewport)]);
    try {
      for (const check of args.checks) {
        const message = compare(user.contentDocument!, target.contentDocument!, check);
        results.push({ selector: check.selector, viewport, ok: message === undefined, ...(message ? { message } : {}) });
      }
    } finally {
      user.remove();
      target.remove();
    }
  }
  return { passed: results.filter((r) => r.ok).length, total: results.length, results };
}
