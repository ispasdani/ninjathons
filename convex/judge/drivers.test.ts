// @vitest-environment node
// Runs the generated drivers for real, with the local Node.js and Python, for
// every signature type. A driver bug means a wrong verdict, so this is the
// most important test in the judge.
import { describe, expect, test } from "vitest";

import { localRunner } from "../../scripts/lib/local-runner";
import { runCode } from "./judge";
import { LANGUAGES } from "./languages";
import { snakeCase } from "./languages/python";
import type { Judge, Language, ValueType } from "./types";

const limits = { timeMs: 5000, memoryMb: 256 };

function echo(type: ValueType): Judge {
  return {
    mode: "function",
    signature: { functionName: "echoValue", params: [{ name: "value", type }], returns: type },
  };
}

const echoSource: Record<Language, string> = {
  javascript: "function echoValue(value) { return value; }",
  python: "def echo_value(value):\n    return value\n",
};

async function run(language: Language, judge: Judge, source: string, inputs: string[]) {
  return await runCode(localRunner, { judge, language, source, limits, tests: inputs, stopAtFirstFailure: false });
}

const samples: [ValueType, unknown][] = [
  ["int", -2147483648],
  ["long", 9007199254740991],
  ["double", 0.1],
  ["bool", true],
  ["string", "héllo \"ninja\" \n ✓ 🥷"],
  ["int[]", [3, -1, 0]],
  ["long[]", []],
  ["double[]", [1.5, -2.25]],
  ["bool[]", [false, true]],
  ["string[]", ["a", ""]],
  ["int[][]", [[1, 2], [], [3]]],
  ["long[][]", [[1]]],
  ["double[][]", [[0.5]]],
  ["bool[][]", [[true], [false]]],
  ["string[][]", [["x", "y"]]],
];

describe.each(Object.keys(LANGUAGES) as Language[])("%s driver", (language) => {
  test("round-trips every type exactly", async () => {
    for (const [type, value] of samples) {
      const out = await run(language, echo(type), echoSource[language], [JSON.stringify({ value })]);
      expect(out.tests[0].status, `${type}: ${out.tests[0].stderr}`).toBe("ok");
      expect(JSON.parse(out.tests[0].stdout), type).toEqual(value);
    }
  });

  test("passes arguments in signature order", async () => {
    const judge: Judge = {
      mode: "function",
      signature: {
        functionName: "subtract",
        params: [{ name: "a", type: "int" }, { name: "b", type: "int" }],
        returns: "int",
      },
    };
    const source = { javascript: "function subtract(a, b) { return a - b; }", python: "def subtract(a, b):\n    return a - b\n" };
    const out = await run(language, judge, source[language], ['{"b": 2, "a": 10}']);
    expect(out.tests[0].stdout.trim()).toBe("8");
  });

  test("keeps the solution's own prints out of the result", async () => {
    const source = {
      javascript: "function echoValue(value) { console.log('debug'); process.stdout.write('raw'); return value; }",
      python: "def echo_value(value):\n    print('debug')\n    return value\n",
    };
    const out = await run(language, echo("int"), source[language], ['{"value": 7}']);
    expect(out.tests[0].stdout.trim()).toBe("7");
    expect(out.tests[0].stderr).toContain("debug");
  });

  test("reports a crash as a runtime error", async () => {
    const source = { javascript: "function echoValue() { throw new Error('boom'); }", python: "def echo_value(value):\n    raise ValueError('boom')\n" };
    const out = await run(language, echo("int"), source[language], ['{"value": 1}']);
    expect(out.tests[0].status).toBe("runtime_error");
    expect(out.tests[0].stderr).toContain("boom");
  });

  test("reports a missing function as a runtime error", async () => {
    const out = await run(language, echo("int"), "", ['{"value": 1}']);
    expect(out.tests[0].status).toBe("runtime_error");
  });

  test("stops an infinite loop at the time limit", async () => {
    const source = { javascript: "function echoValue() { for (;;) {} }", python: "def echo_value(value):\n    while True:\n        pass\n" };
    const out = await runCode(localRunner, {
      judge: echo("int"),
      language,
      source: source[language],
      limits: { timeMs: 300, memoryMb: 256 },
      tests: ['{"value": 1}', '{"value": 2}'],
      stopAtFirstFailure: true,
    });
    expect(out.tests).toHaveLength(1);
    expect(out.tests[0].status).toBe("time_limit");
  });

  test("starter code defines the function the driver calls", async () => {
    const judge = echo("int[]");
    if (judge.mode !== "function") throw new Error();
    const starter = LANGUAGES[language].starterCode(judge.signature);
    // The empty starter returns nothing; the program must still run and print null.
    const out = await run(language, judge, starter, ['{"value": [1]}']);
    expect(out.tests[0].status, out.tests[0].stderr).toBe("ok");
    expect(out.tests[0].stdout.trim()).toBe("null");
  });
});

test("python accepts a LeetCode-style Solution class", async () => {
  const source = "class Solution:\n    def echoValue(self, value):\n        return value * 2\n";
  const out = await run("python", echo("int"), source, ['{"value": 21}']);
  expect(out.tests[0].stdout.trim()).toBe("42");
});

test("stdio mode runs the program as written", async () => {
  const source = { javascript: "const s = require('fs').readFileSync(0, 'utf8'); console.log(s.trim().split(' ').map(Number).reduce((a, b) => a + b));", python: "print(sum(map(int, input().split())))" };
  for (const language of ["javascript", "python"] as const) {
    const out = await run(language, { mode: "stdio" }, source[language], ["1 2 3\n"]);
    expect(out.tests[0].stdout.trim()).toBe("6");
  }
});

test("snakeCase", () => {
  expect(snakeCase("twoSum")).toBe("two_sum");
  expect(snakeCase("getURL")).toBe("get_url");
  expect(snakeCase("parseHTMLTable")).toBe("parse_html_table");
  expect(snakeCase("max2Sum")).toBe("max2_sum");
  expect(snakeCase("add")).toBe("add");
});
