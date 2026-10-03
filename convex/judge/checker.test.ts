import { describe, expect, test } from "vitest";

import { outputMatches } from "./checker";
import { decideVerdict } from "./judge";
import type { Judge } from "./types";
import { checkFunctionTest, checkValue } from "./values";

const fn: Judge = { mode: "function", signature: { functionName: "f", params: [], returns: "int[]" } };
const stdio: Judge = { mode: "stdio" };

describe("function mode", () => {
  test("exact compares JSON values, not text", () => {
    expect(outputMatches(fn, { kind: "exact" }, "[0,1]", "[0, 1]\n")).toBe(true);
    expect(outputMatches(fn, { kind: "exact" }, "[0,1]", "[1,0]")).toBe(false);
    expect(outputMatches(fn, { kind: "exact" }, "5", "5.0")).toBe(true);
    expect(outputMatches(fn, { kind: "exact" }, '"a"', "a")).toBe(false);
    expect(outputMatches(fn, { kind: "exact" }, "true", "1")).toBe(false);
    expect(outputMatches(fn, { kind: "exact" }, "[1]", "")).toBe(false);
    expect(outputMatches(fn, { kind: "exact" }, "[1]", "[1,2]")).toBe(false);
  });

  test("unordered ignores the order of the top-level array only", () => {
    expect(outputMatches(fn, { kind: "unordered" }, "[0,1]", "[1,0]")).toBe(true);
    expect(outputMatches(fn, { kind: "unordered" }, "[[1,2],[3]]", "[[3],[1,2]]")).toBe(true);
    expect(outputMatches(fn, { kind: "unordered" }, "[[1,2]]", "[[2,1]]")).toBe(false);
    expect(outputMatches(fn, { kind: "unordered" }, "[1,1,2]", "[1,2,2]")).toBe(false);
  });

  test("float uses the tolerance, absolute below 1 and relative above", () => {
    const float = { kind: "float" as const, tolerance: 1e-6 };
    expect(outputMatches(fn, float, "0.3", "0.30000000000000004")).toBe(true);
    expect(outputMatches(fn, float, "0.3", "0.3001")).toBe(false);
    expect(outputMatches(fn, float, "1000000", "1000000.5")).toBe(true);
    expect(outputMatches(fn, float, "[1.5,2]", "[1.5000001,2]")).toBe(true);
  });
});

describe("stdio mode", () => {
  test("exact ignores trailing whitespace and line endings only", () => {
    expect(outputMatches(stdio, { kind: "exact" }, "1 2\n3\n", "1 2  \r\n3")).toBe(true);
    expect(outputMatches(stdio, { kind: "exact" }, "1 2\n3", "1  2\n3")).toBe(false);
    expect(outputMatches(stdio, { kind: "exact" }, "1\n2", "1\n\n2")).toBe(false);
  });

  test("unordered compares lines as a multiset", () => {
    expect(outputMatches(stdio, { kind: "unordered" }, "a\nb\n", "b\na")).toBe(true);
    expect(outputMatches(stdio, { kind: "unordered" }, "a\na", "a\nb")).toBe(false);
  });

  test("float compares token by token", () => {
    const float = { kind: "float" as const, tolerance: 1e-4 };
    expect(outputMatches(stdio, float, "3.14159 yes", "3.1416\nyes")).toBe(true);
    expect(outputMatches(stdio, float, "0", "")).toBe(false);
    expect(outputMatches(stdio, float, "1 2", "1")).toBe(false);
  });
});

describe("decideVerdict", () => {
  const tests = [
    { input: "{}", expected: "[1]", visible: true },
    { input: "{}", expected: "[2]", visible: false },
  ];
  const ok = (stdout: string) => ({ status: "ok" as const, stdout, stderr: "", timeMs: 10, exitCode: 0 });

  test("accepted when every output matches", () => {
    const v = decideVerdict({ judge: fn, checker: { kind: "exact" }, tests, stopAtFirstFailure: true }, { tests: [ok("[1]"), ok("[2]")] });
    expect(v).toMatchObject({ status: "accepted", passed: 2, total: 2 });
  });

  test("hides everything about hidden tests", () => {
    const v = decideVerdict(
      { judge: fn, checker: { kind: "exact" }, tests, stopAtFirstFailure: true },
      { tests: [ok("[1]"), { ...ok("[9]"), stderr: "secret input" }] },
    );
    expect(v.status).toBe("wrong_answer");
    expect(v.tests[1]).toEqual({ status: "wrong_answer", timeMs: 10, visible: false });
    expect(v.tests[0].expected).toBe("[1]");
  });

  test("missing results never count as accepted", () => {
    const v = decideVerdict({ judge: fn, checker: { kind: "exact" }, tests, stopAtFirstFailure: true }, { tests: [ok("[1]")] });
    expect(v.status).not.toBe("accepted");
  });

  test("compile errors come back with the compiler output", () => {
    const v = decideVerdict(
      { judge: fn, checker: { kind: "exact" }, tests, stopAtFirstFailure: true },
      { compile: { ok: false, output: "error: x" }, tests: [] },
    );
    expect(v).toMatchObject({ status: "compile_error", compileOutput: "error: x", passed: 0 });
  });
});

describe("values", () => {
  test("int and long ranges", () => {
    expect(checkValue("int", 2 ** 31 - 1)).toBeNull();
    expect(checkValue("int", 2 ** 31)).not.toBeNull();
    expect(checkValue("int", 1.5)).not.toBeNull();
    expect(checkValue("long", 2 ** 53)).not.toBeNull();
    expect(checkValue("double", 1)).toBeNull();
    expect(checkValue("int[][]", [[1], [2, "3"]])).toContain("value[1][1]");
  });

  test("tests must match the signature", () => {
    const sig = { functionName: "f", params: [{ name: "a", type: "int" as const }], returns: "bool" as const };
    expect(checkFunctionTest(sig, '{"a": 1}', "true")).toBeNull();
    expect(checkFunctionTest(sig, '{"a": 1, "b": 2}', "true")).toContain("b");
    expect(checkFunctionTest(sig, "{}", "true")).toContain("missing");
    expect(checkFunctionTest(sig, '{"a": 1}', "1")).toContain("output");
  });
});
