import type { LanguageSpec } from "./types";
import type { Signature, ValueType } from "../types";

const BASE = {
  int: { cs: "int", read: "Int", zero: "0" },
  long: { cs: "long", read: "Long", zero: "0" },
  double: { cs: "double", read: "Double", zero: "0.0" },
  bool: { cs: "bool", read: "Bool", zero: "false" },
  string: { cs: "string", read: "Str", zero: '""' },
} as const;
type Base = keyof typeof BASE;

function split(type: ValueType): { base: Base; depth: number } {
  const depth = (type.match(/\[\]/g) ?? []).length;
  return { base: type.replace(/\[\]/g, "") as Base, depth };
}

function csType(type: ValueType): string {
  const { base, depth } = split(type);
  return BASE[base].cs + "[]".repeat(depth);
}

function zero(type: ValueType): string {
  const { base, depth } = split(type);
  return depth === 0 ? BASE[base].zero : `new ${BASE[base].cs}[0]${"[]".repeat(depth - 1)}`;
}

/** twoSum → TwoSum: C# methods are PascalCase, as on LeetCode. */
export function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function starterCode(signature: Signature): string {
  const params = signature.params.map((p) => `${csType(p.type)} ${p.name}`).join(", ");
  return [
    "public class Solution {",
    `    public ${csType(signature.returns)} ${pascalCase(signature.functionName)}(${params}) {`,
    `        return ${zero(signature.returns)};`,
    "    }",
    "}",
    "",
  ].join("\n");
}

// Compiled with every program, so the user's file needs no using lines
// (LeetCode's C# works the same way).
const USINGS = [
  "global using System;",
  "global using System.Collections.Generic;",
  "global using System.Linq;",
  "global using System.Text;",
  "",
].join("\n");

function prelude(): string {
  const inv = "System.Globalization.CultureInfo.InvariantCulture";
  const lines = [
    "  static byte[] input;",
    "  static int p;",
    "  static readonly StringBuilder o = new StringBuilder();",
    "  static string Next() {",
    "    while (p < input.Length && input[p] <= ' ') p++;",
    "    int s = p;",
    "    while (p < input.Length && input[p] > ' ') p++;",
    "    return Encoding.Latin1.GetString(input, s, p - s);",
    "  }",
    `  static int ReadInt() => int.Parse(Next(), ${inv});`,
    `  static long ReadLong() => long.Parse(Next(), ${inv});`,
    `  static double ReadDouble() => double.Parse(Next(), System.Globalization.NumberStyles.Float, ${inv});`,
    '  static bool ReadBool() => Next() == "true";',
    "  static string ReadStr() => Encoding.UTF8.GetString(Convert.FromHexString(Next().Substring(1)));",
    `  static void Put(int v) => o.Append(v.ToString(${inv})).Append(' ');`,
    `  static void Put(long v) => o.Append(v.ToString(${inv})).Append(' ');`,
    `  static void Put(double v) => o.Append(v.ToString("R", ${inv})).Append(' ');`,
    '  static void Put(bool v) => o.Append(v ? "true " : "false ");',
    "  static void Put(string v) {",
    '    if (v == null) { o.Append("null "); return; }',
    "    o.Append('s').Append(Convert.ToHexString(Encoding.UTF8.GetBytes(v)).ToLowerInvariant()).Append(' ');",
    "  }",
  ];
  for (const { cs, read } of Object.values(BASE)) {
    for (const depth of [1, 2]) {
      const t = cs + "[]".repeat(depth);
      const inner = `Read${read}${depth === 1 ? "" : depth - 1}()`;
      const make = `new ${cs}[n]${depth === 2 ? "[]" : ""}`;
      lines.push(
        `  static ${t} Read${read}${depth}() { int n = ReadInt(); var a = ${make}; for (int i = 0; i < n; i++) a[i] = ${inner}; return a; }`,
        `  static void Put(${t} v) { if (v == null) { o.Append("null "); return; } Put(v.Length); foreach (var x in v) Put(x); }`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * Its own file, so solution.cs is only the user's code. The solution runs on
 * a thread with a 256 MB stack for deep recursion, with Console.Out pointed
 * at stderr. An exception crashes the process with .NET's usual message.
 */
function driver(signature: Signature): string {
  const reader = (type: ValueType) => {
    const { base, depth } = split(type);
    return `Read${BASE[base].read}${depth || ""}()`;
  };
  const args = signature.params.map((_, i) => `a${i}`).join(", ");
  return [
    "static class NjMain {",
    prelude(),
    "  static void Main() {",
    "    using (var stdin = Console.OpenStandardInput()) {",
    "      var buffer = new System.IO.MemoryStream();",
    "      stdin.CopyTo(buffer);",
    "      input = buffer.ToArray();",
    "    }",
    ...signature.params.map((param, i) => `    var a${i} = ${reader(param.type)};`),
    "    var stdout = Console.OpenStandardOutput();",
    "    Console.SetOut(Console.Error);",
    `    ${csType(signature.returns)} result = default;`,
    `    var t = new System.Threading.Thread(() => { result = new Solution().${pascalCase(signature.functionName)}(${args}); }, 256 << 20);`,
    "    t.Start();",
    "    t.Join();",
    "    Put(result);",
    "    var bytes = Encoding.ASCII.GetBytes(o.Append('\\n').ToString());",
    "    stdout.Write(bytes, 0, bytes.Length);",
    "    stdout.Flush();",
    "  }",
    "}",
    "",
  ].join("\n");
}

/** Keeps frames in solution.cs (within the user's lines), drops the runtime's and the driver's. */
function cleanError(stderr: string, sourceLines: number): string {
  return stderr
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => {
      if (/^\s*--- End of stack trace/.test(line)) return false;
      if (!/^\s+at\s/.test(line)) return true;
      const frame = line.match(/solution\.cs:line (\d+)/);
      return frame !== null && Number(frame[1]) <= sourceLines;
    })
    .join("\n")
    .replace(/[^\s]*solution\.cs/g, "solution.cs")
    .trim();
}

export const csharp: LanguageSpec = {
  id: "csharp",
  label: "C#",
  version: ".NET 10",
  // Runtime start-up and JIT.
  timeMultiplier: 1.5,
  image: "runner",
  wire: "tokens",
  starterCode,
  cleanError,
  program(judge, source) {
    const files: Record<string, string> = { "solution.cs": source, "usings.cs": USINGS };
    if (judge.mode === "function") files["driver.cs"] = driver(judge.signature);
    return {
      files,
      // bin/cs-build in the runner image: Roslyn without MSBuild.
      compile: ["cs-build", ...Object.keys(files)],
      run: ["dotnet", "solution.dll"],
    };
  },
};
