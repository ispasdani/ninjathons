import type { LanguageSpec } from "./types";
import type { RunJob, Signature, ValueType } from "../types";

// Each base type: its Java type, the suffix of its reader, and a default value.
const BASE = {
  int: { java: "int", read: "Int", zero: "0" },
  long: { java: "long", read: "Long", zero: "0" },
  double: { java: "double", read: "Double", zero: "0.0" },
  bool: { java: "boolean", read: "Bool", zero: "false" },
  string: { java: "String", read: "Str", zero: '""' },
} as const;
type Base = keyof typeof BASE;

function split(type: ValueType): { base: Base; depth: number } {
  const depth = (type.match(/\[\]/g) ?? []).length;
  return { base: type.replace(/\[\]/g, "") as Base, depth };
}

function javaType(type: ValueType): string {
  const { base, depth } = split(type);
  return BASE[base].java + "[]".repeat(depth);
}

function zero(type: ValueType): string {
  const { base, depth } = split(type);
  return depth === 0 ? BASE[base].zero : `new ${BASE[base].java}[0]${"[]".repeat(depth - 1)}`;
}

function reader(type: ValueType): string {
  const { base, depth } = split(type);
  return `read${BASE[base].read}${depth || ""}()`;
}

function starterCode(signature: Signature): string {
  const params = signature.params.map((p) => `${javaType(p.type)} ${p.name}`).join(", ");
  return [
    "import java.util.*;",
    "",
    "class Solution {",
    `    public ${javaType(signature.returns)} ${signature.functionName}(${params}) {`,
    `        return ${zero(signature.returns)};`,
    "    }",
    "}",
    "",
  ].join("\n");
}

/** Readers and writers for every signature type, in the token format of ../wire.ts. */
function prelude(): string {
  const lines: string[] = [
    "  static byte[] in;",
    "  static int p;",
    "  static StringBuilder o = new StringBuilder();",
    "  static final char[] HEX = \"0123456789abcdef\".toCharArray();",
    "  static String next() {",
    "    while (p < in.length && in[p] <= ' ') p++;",
    "    int s = p;",
    "    while (p < in.length && in[p] > ' ') p++;",
    "    return new String(in, s, p - s, java.nio.charset.StandardCharsets.ISO_8859_1);",
    "  }",
    "  static int readInt() { return Integer.parseInt(next()); }",
    "  static long readLong() { return Long.parseLong(next()); }",
    "  static double readDouble() { return Double.parseDouble(next()); }",
    "  static boolean readBool() { return next().equals(\"true\"); }",
    "  static String readStr() {",
    "    String t = next();",
    "    byte[] b = new byte[(t.length() - 1) / 2];",
    "    for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(t.substring(1 + 2 * i, 3 + 2 * i), 16);",
    "    return new String(b, java.nio.charset.StandardCharsets.UTF_8);",
    "  }",
    "  static void put(int v) { o.append(v).append(' '); }",
    "  static void put(long v) { o.append(v).append(' '); }",
    "  static void put(double v) { o.append(Double.toString(v)).append(' '); }",
    "  static void put(boolean v) { o.append(v).append(' '); }",
    "  static void put(String v) {",
    "    if (v == null) { o.append(\"null \"); return; }",
    "    o.append('s');",
    "    for (byte x : v.getBytes(java.nio.charset.StandardCharsets.UTF_8)) o.append(HEX[(x >> 4) & 15]).append(HEX[x & 15]);",
    "    o.append(' ');",
    "  }",
  ];
  for (const { java, read } of Object.values(BASE)) {
    for (const depth of [1, 2]) {
      const t = java + "[]".repeat(depth);
      const inner = `read${read}${depth === 1 ? "" : depth - 1}()`;
      const make = `new ${java}[n]${depth === 2 ? "[]" : ""}`;
      lines.push(
        `  static ${t} read${read}${depth}() { int n = readInt(); ${t} a = ${make}; for (int i = 0; i < n; i++) a[i] = ${inner}; return a; }`,
        `  static void put(${t} v) { if (v == null) { o.append("null "); return; } put(v.length); for (${java}${"[]".repeat(depth - 1)} x : v) put(x); }`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * A separate file, so Solution.java holds only the user's code. Arguments are
 * read before the call; the solution runs on a thread with a 256 MB stack so
 * deep recursion works, with System.out pointed at stderr so its prints stay
 * out of the result. A crash is rethrown from main, with its own stack trace.
 */
function driver(signature: Signature): string {
  const { base, depth } = split(signature.returns);
  const args = signature.params.map((_, i) => `a${i}`).join(", ");
  return [
    "class NjMain {",
    prelude(),
    "  public static void main(String[] args) throws Throwable {",
    "    in = System.in.readAllBytes();",
    ...signature.params.map((param, i) => `    final ${javaType(param.type)} a${i} = ${reader(param.type)};`),
    `    final ${javaType(signature.returns)}[] result = new ${BASE[base].java}[1]${"[]".repeat(depth)};`,
    "    final Throwable[] error = new Throwable[1];",
    "    java.io.PrintStream out = System.out;",
    "    System.setOut(System.err);",
    "    Thread t = new Thread(null, () -> {",
    `      try { result[0] = new Solution().${signature.functionName}(${args}); } catch (Throwable e) { error[0] = e; }`,
    '    }, "main", 1L << 28);',
    "    t.start();",
    "    t.join();",
    "    if (error[0] != null) throw error[0];",
    "    put(result[0]);",
    "    out.print(o.append('\\n'));",
    "    out.flush();",
    "  }",
    "}",
    "",
  ].join("\n");
}

/** Keeps stack frames in the user's file (and within their lines); drops the driver's and the JDK's. */
function cleanError(stderr: string, sourceLines: number): string {
  return stderr
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => {
      if (/^\s+\.\.\. \d+ more$/.test(line)) return false;
      if (!/^\s+at\s/.test(line)) return true;
      const frame = line.match(/\((?:Solution|Main)\.java:(\d+)\)/);
      return frame !== null && Number(frame[1]) <= sourceLines;
    })
    .join("\n")
    .trim();
}

export const java: LanguageSpec = {
  id: "java",
  label: "Java",
  version: "Java 25",
  // JVM start-up and warm-up.
  timeMultiplier: 1.5,
  wire: "tokens",
  starterCode,
  cleanError,
  program(judge, source): Pick<RunJob, "files" | "compile" | "run"> {
    const run = ["java", "-XX:+UseSerialGC", "-XX:-UsePerfData", "-cp", "."];
    if (judge.mode === "stdio") {
      // Full programs are a class Main with a main method.
      return {
        files: { "Main.java": source },
        compile: ["javac", "-encoding", "UTF-8", "-d", ".", "Main.java"],
        run: [...run, "Main"],
      };
    }
    return {
      files: { "Solution.java": source, "NjMain.java": driver(judge.signature) },
      compile: ["javac", "-encoding", "UTF-8", "-d", ".", "Solution.java", "NjMain.java"],
      run: [...run, "NjMain"],
    };
  },
};
