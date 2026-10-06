// @vitest-environment node
// Runs the generated drivers for real, for every language and signature type.
// A driver bug means a wrong verdict, so this is the most important test in
// the judge. Compiled languages need the runner image (`npm run runner:build`);
// without it only JavaScript, TypeScript and Python run, on this computer.
import { describe, expect, test } from "vitest";

import { localRunner, runnerMode } from "../../scripts/lib/local-runner";
import { judgeSubmission, runCode } from "./judge";
import { LANGUAGES } from "./languages";
import { pascalCase } from "./languages/csharp";
import { snakeCase } from "./languages/python";
import type { Judge, Language, Signature, ValueType } from "./types";
import { decodeResult, encodeArgs } from "./wire";

const ALL = Object.keys(LANGUAGES) as Language[];
const languages: Language[] = runnerMode() === "docker" ? ALL : ["javascript", "typescript", "python"];
const limits = { timeMs: 5000, memoryMb: 256 };
// Compiling takes a second or two, and many run side by side.
const TIMEOUT = 120_000;

function signatureOf(judge: Judge): Signature {
  if (judge.mode !== "function") throw new Error("not function mode");
  return judge.signature;
}

function echo(type: ValueType): Judge {
  return {
    mode: "function",
    signature: { functionName: "echoValue", params: [{ name: "value", type }], returns: type },
  };
}

/** The language's starter code for `judge`, with `body` in place of its placeholder. */
function solve(language: Language, judge: Judge, body: string): string {
  const starter = LANGUAGES[language].starterCode(signatureOf(judge));
  switch (language) {
    case "javascript":
    case "typescript":
      return starter.replace("{\n  \n}", `{\n  ${body}\n}`);
    case "python":
      return starter.replace("pass", body);
    case "rust":
      return starter.replace(/^( {8}).*$/m, `$1${body}`);
    default:
      return starter.replace(/return .*;/, body);
  }
}

const returnValue: Record<Language, string> = {
  javascript: "return value;",
  typescript: "return value;",
  python: "return value",
  java: "return value;",
  csharp: "return value;",
  cpp: "return value;",
  rust: "value",
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
  ["double[]", [1.5, -2.25, 1e-7, 123456789.125]],
  ["bool[]", [false, true]],
  ["string[]", ["a", "", "two words"]],
  ["int[][]", [[1, 2], [], [3]]],
  ["long[][]", [[1, -9007199254740991]]],
  ["double[][]", [[0.5], []]],
  ["bool[][]", [[true], [false]]],
  ["string[][]", [["x", "y"], []]],
];

describe.concurrent.each(languages)("%s driver", (language) => {
  test.concurrent.each(samples)("round-trips %s exactly", { timeout: TIMEOUT }, async (type, value) => {
    const out = await run(language, echo(type), solve(language, echo(type), returnValue[language]), [
      JSON.stringify({ value }),
    ]);
    expect(out.compile?.ok ?? true, out.compile?.output).toBe(true);
    expect(out.tests[0].status, out.tests[0].stderr).toBe("ok");
    expect(JSON.parse(out.tests[0].stdout)).toEqual(value);
  });

  test("passes arguments in signature order", { timeout: TIMEOUT }, async () => {
    const judge: Judge = {
      mode: "function",
      signature: {
        functionName: "subtract",
        params: [{ name: "a", type: "int" }, { name: "b", type: "int" }],
        returns: "int",
      },
    };
    const body = language === "python" || language === "rust" ? "a - b" : "return a - b;";
    const source = solve(language, judge, language === "python" ? "return a - b" : body);
    const out = await run(language, judge, source, ['{"b": 2, "a": 10}']);
    expect(out.tests[0].stdout.trim(), out.tests[0].stderr).toBe("8");
  });

  test("keeps the solution's own prints out of the result", { timeout: TIMEOUT }, async () => {
    const body: Record<Language, string> = {
      javascript: "console.log('debug'); process.stdout.write('raw'); return value;",
      typescript: "console.log('debug'); process.stdout.write('raw'); return value;",
      python: "print('debug')\n    return value",
      java: 'System.out.println("debug"); System.out.print("raw"); return value;',
      csharp: 'Console.WriteLine("debug"); Console.Write("raw"); return value;',
      cpp: 'cout << "debug" << endl; printf("raw"); return value;',
      rust: 'println!("debug"); print!("raw"); value',
    };
    const out = await run(language, echo("int"), solve(language, echo("int"), body[language]), ['{"value": 7}']);
    expect(out.tests[0].stdout.trim(), out.tests[0].stderr).toBe("7");
    expect(out.tests[0].stderr).toContain("debug");
  });

  const crash: Record<Language, string> = {
    javascript: "throw new Error('boom');",
    typescript: "throw new Error('boom');",
    python: "raise ValueError('boom')",
    java: 'throw new RuntimeException("boom");',
    csharp: 'throw new Exception("boom");',
    cpp: 'throw runtime_error("boom");',
    rust: 'panic!("boom")',
  };

  test("reports a crash as a runtime error", { timeout: TIMEOUT }, async () => {
    const out = await run(language, echo("int"), solve(language, echo("int"), crash[language]), ['{"value": 1}']);
    expect(out.tests[0].status).toBe("runtime_error");
    expect(out.tests[0].stderr).toContain("boom");
  });

  test("shows errors from the user's code only, stopping at the first crash", { timeout: TIMEOUT }, async () => {
    const source = solve(language, echo("int"), crash[language]);
    const line = source.split("\n").findIndex((l) => l.includes("boom")) + 1;
    const tests = ['{"value": 1}', '{"value": 2}'].map((input) => ({ input, expected: "1", visible: true }));
    const verdict = await judgeSubmission(localRunner, {
      judge: echo("int"), checker: { kind: "exact" }, limits, language, source, tests, stopAtFirstFailure: false,
    });
    expect(verdict.status).toBe("runtime_error");
    expect(verdict.tests).toHaveLength(1);
    const logs = verdict.tests[0].logs ?? "";
    expect(logs).toContain("boom");
    // C++ exceptions carry no file or line.
    if (language !== "cpp") {
      const file = language === "java" ? "Solution.java" : `solution.${{ javascript: "js", typescript: "ts", python: "py", csharp: "cs", rust: "rs" }[language]}`;
      expect(logs).toContain(file);
      expect(logs).toMatch(new RegExp(`:${line}\\b|line ${line}\\b`));
    }
    for (const internal of ["main.", "node:internal", "__nj", "nj_", "NjMain", "driver.cs", "Node.js v", "/jobs", "/tmp", "Temp", "RUST_BACKTRACE"]) {
      expect(logs, internal).not.toContain(internal);
    }
  });

  test("rejects a missing function", { timeout: TIMEOUT }, async () => {
    const verdict = await judgeSubmission(localRunner, {
      judge: echo("int"), checker: { kind: "exact" }, limits, language, source: "",
      tests: [{ input: '{"value": 1}', expected: "1", visible: true }], stopAtFirstFailure: false,
    });
    expect(["runtime_error", "compile_error"]).toContain(verdict.status);
  });

  test("stops an infinite loop at the time limit", { timeout: TIMEOUT }, async () => {
    const body: Record<Language, string> = {
      javascript: "for (;;) {}",
      typescript: "for (;;) {}",
      python: "while True:\n        pass",
      java: "while (true) {}",
      csharp: "while (true) {}",
      // A loop without side effects is undefined behaviour in C++.
      cpp: "volatile int spin = 0; while (true) spin++;",
      rust: "loop {}",
    };
    const out = await runCode(localRunner, {
      judge: echo("int"),
      language,
      source: solve(language, echo("int"), body[language]),
      limits: { timeMs: 300, memoryMb: 256 },
      tests: ['{"value": 1}', '{"value": 2}'],
      stopAtFirstFailure: true,
    });
    expect(out.tests).toHaveLength(1);
    expect(out.tests[0].status).toBe("time_limit");
  });

  test("enforces the memory limit, and normal programs fit under it", { timeout: TIMEOUT }, async () => {
    const hog: Record<Language, string> = {
      javascript: "const a = []; while (true) a.push(new Array(1e6).fill(value + 0.5));",
      typescript: "const a: number[][] = []; while (true) a.push(new Array(1e6).fill(value + 0.5));",
      python: "x = [value] * (500 * 1024 * 1024)\n    return len(x)",
      java: "long[] a = new long[400_000_000]; return (int) a[value];",
      csharp: "var a = new long[400_000_000]; return (int)a[value];",
      cpp: "vector<long long> a(400000000); return (int)a[value];",
      // black_box, or the compiler removes an all-zero vector it can see through.
      rust: "let a = std::hint::black_box(vec![0i64; 400_000_000]); a[value as usize] as i32",
    };
    const small = { timeMs: 5000, memoryMb: 64 };
    const judge = echo("int");
    const tests = [{ input: '{"value": 1}', expected: "1", visible: true }];
    const over = await judgeSubmission(localRunner, {
      judge, checker: { kind: "exact" }, limits: small, language,
      source: solve(language, judge, hog[language]), tests, stopAtFirstFailure: true,
    });
    expect(over.status, over.tests[0]?.logs).toBe("memory_limit");
    const fits = await judgeSubmission(localRunner, {
      judge, checker: { kind: "exact" }, limits: small, language,
      source: solve(language, judge, returnValue[language]), tests, stopAtFirstFailure: true,
    });
    expect(fits.status, fits.tests[0]?.logs ?? fits.compileOutput).toBe("accepted");
  });

  test("starter code compiles and runs as it is", { timeout: TIMEOUT }, async () => {
    const judge = echo("int[]");
    const out = await run(language, judge, LANGUAGES[language].starterCode(signatureOf(judge)), ['{"value": [1]}']);
    expect(out.compile?.ok ?? true, out.compile?.output).toBe(true);
    expect(out.tests[0].status, out.tests[0].stderr).toBe("ok");
    // JavaScript, TypeScript and Python start with an empty function (null);
    // the typed languages return an empty array.
    const typed = !["javascript", "typescript", "python"].includes(language);
    expect(out.tests[0].stdout.trim()).toBe(typed ? "[]" : "null");
  });

  test("stdio mode runs the program as written", { timeout: TIMEOUT }, async () => {
    const source: Record<Language, string> = {
      javascript: "const s = require('fs').readFileSync(0, 'utf8'); console.log(s.trim().split(' ').map(Number).reduce((a, b) => a + b));",
      typescript: "const s: string = process.getBuiltinModule('fs').readFileSync(0, 'utf8'); console.log(s.trim().split(' ').map(Number).reduce((a: number, b: number) => a + b));",
      python: "print(sum(map(int, input().split())))",
      java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    long total = 0;\n    while (in.hasNextLong()) total += in.nextLong();\n    System.out.println(total);\n  }\n}\n",
      csharp: "long total = 0;\nforeach (var x in Console.In.ReadToEnd().Split((char[])null, StringSplitOptions.RemoveEmptyEntries)) total += long.Parse(x);\nConsole.WriteLine(total);\n",
      cpp: "#include <bits/stdc++.h>\nint main() {\n  long long total = 0, x;\n  while (std::cin >> x) total += x;\n  std::cout << total << \"\\n\";\n}\n",
      rust: "use std::io::Read;\n\nfn main() {\n    let mut s = String::new();\n    std::io::stdin().read_to_string(&mut s).unwrap();\n    let total: i64 = s.split_whitespace().map(|x| x.parse::<i64>().unwrap()).sum();\n    println!(\"{}\", total);\n}\n",
    };
    const out = await run(language, { mode: "stdio" }, source[language], ["1 2 3\n"]);
    expect(out.compile?.ok ?? true, out.compile?.output).toBe(true);
    expect(out.tests[0].stdout.trim(), out.tests[0].stderr).toBe("6");
  });
});

test("python accepts a LeetCode-style Solution class", async () => {
  const source = "class Solution:\n    def echoValue(self, value):\n        return value * 2\n";
  const out = await run("python", echo("int"), source, ['{"value": 21}']);
  expect(out.tests[0].stdout.trim()).toBe("42");
});

test.runIf(languages.includes("cpp"))("a C++ segfault says so", { timeout: TIMEOUT }, async () => {
  const source = solve("cpp", echo("int"), "volatile int* p = nullptr; *p = value; return value;");
  const verdict = await judgeSubmission(localRunner, {
    judge: echo("int"), checker: { kind: "exact" }, limits, language: "cpp", source,
    tests: [{ input: '{"value": 1}', expected: "1", visible: true }], stopAtFirstFailure: true,
  });
  expect(verdict.status).toBe("runtime_error");
  expect(verdict.tests[0].logs).toMatch(/Segmentation fault|Illegal instruction/);
});

describe("token wire format", () => {
  test.each(samples)("round-trips %s", (type, value) => {
    const signature = signatureOf(echo(type));
    const tokens = encodeArgs(signature, JSON.stringify({ value }));
    expect(JSON.parse(decodeResult(type, tokens))).toEqual(value);
  });

  test("encodes arguments in signature order", () => {
    const signature: Signature = {
      functionName: "f",
      params: [{ name: "s", type: "string" }, { name: "xs", type: "int[][]" }],
      returns: "int",
    };
    expect(encodeArgs(signature, '{"xs": [[1, 2], []], "s": "hi"}')).toBe("s6869 2 2 1 2 0\n");
  });

  test("reads a null array or string", () => {
    expect(decodeResult("int[]", "null")).toBe("null");
    expect(decodeResult("string", "null\n")).toBe("null");
  });

  test("rejects output that isn't exactly one value", () => {
    expect(() => decodeResult("int", "")).toThrow(/ended early/);
    expect(() => decodeResult("int", "1 2")).toThrow(/extra output/);
    expect(() => decodeResult("int", "1.5")).toThrow(/bad integer/);
    expect(() => decodeResult("double", "NaN")).toThrow(/NaN/);
    expect(() => decodeResult("int[]", "3 1 2")).toThrow(/ended early/);
  });
});

test("snakeCase", () => {
  expect(snakeCase("twoSum")).toBe("two_sum");
  expect(snakeCase("getURL")).toBe("get_url");
  expect(snakeCase("parseHTMLTable")).toBe("parse_html_table");
  expect(snakeCase("max2Sum")).toBe("max2_sum");
  expect(snakeCase("add")).toBe("add");
});

test("pascalCase", () => {
  expect(pascalCase("twoSum")).toBe("TwoSum");
  expect(pascalCase("add")).toBe("Add");
});
