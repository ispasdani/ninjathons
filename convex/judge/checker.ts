import type { Checker, Judge } from "./types";

/**
 * Compares a program's output with the expected one, using the problem's
 * checker. Runs in Convex, so expected outputs never leave the server.
 *
 * Function mode compares JSON values: numbers by value (with the tolerance for
 * `float`), `unordered` ignores the order of the top-level array. Stdio mode
 * compares text: `exact` ignores trailing whitespace on each line and at the
 * end, `float` compares token by token, `unordered` ignores line order.
 */
export function outputMatches(judge: Judge, checker: Checker, expected: string, actual: string): boolean {
  return judge.mode === "function"
    ? jsonMatches(checker, expected, actual)
    : textMatches(checker, expected, actual);
}

function jsonMatches(checker: Checker, expected: string, actual: string): boolean {
  let want: unknown;
  let got: unknown;
  try {
    want = JSON.parse(expected);
    got = JSON.parse(actual);
  } catch {
    return false;
  }
  const tolerance = checker.kind === "float" ? checker.tolerance : 0;
  if (checker.kind === "unordered" && Array.isArray(want) && Array.isArray(got)) {
    return valuesEqual(sortByKey(want), sortByKey(got), tolerance);
  }
  return valuesEqual(want, got, tolerance);
}

function sortByKey(items: unknown[]): unknown[] {
  return items
    .map((item) => [JSON.stringify(item), item] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, item]) => item);
}

function numbersEqual(a: number, b: number, tolerance: number): boolean {
  if (tolerance === 0) return a === b;
  // Absolute for small values, relative for large ones.
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a));
}

function valuesEqual(want: unknown, got: unknown, tolerance: number): boolean {
  if (typeof want === "number") return typeof got === "number" && numbersEqual(want, got, tolerance);
  if (Array.isArray(want)) {
    return (
      Array.isArray(got) &&
      want.length === got.length &&
      want.every((item, i) => valuesEqual(item, got[i], tolerance))
    );
  }
  return want === got;
}

function lines(text: string): string[] {
  const all = text.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trimEnd());
  while (all.length > 0 && all[all.length - 1] === "") all.pop();
  return all;
}

function textMatches(checker: Checker, expected: string, actual: string): boolean {
  switch (checker.kind) {
    case "exact":
      return lines(expected).join("\n") === lines(actual).join("\n");
    case "unordered": {
      const want = lines(expected).sort();
      const got = lines(actual).sort();
      return want.length === got.length && want.every((line, i) => line === got[i]);
    }
    case "float": {
      const want = expected.trim().split(/\s+/);
      const got = actual.trim().split(/\s+/);
      return (
        want.length === got.length &&
        want.every((token, i) => {
          const a = Number(token);
          const b = got[i] === "" ? NaN : Number(got[i]);
          return Number.isNaN(a) ? token === got[i] : !Number.isNaN(b) && numbersEqual(a, b, checker.tolerance);
        })
      );
    }
  }
}
