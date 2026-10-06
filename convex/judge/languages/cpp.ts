import { underUlimit } from "./limits";
import type { LanguageSpec } from "./types";
import type { Signature, ValueType } from "../types";

const BASE: Record<string, string> = {
  int: "int",
  long: "long long",
  double: "double",
  bool: "bool",
  string: "string",
};

function cppType(type: ValueType): string {
  if (type.endsWith("[]")) return `vector<${cppType(type.slice(0, -2) as ValueType)}>`;
  return BASE[type];
}

/** Vectors by reference, as LeetCode writes them; scalars and strings by value. */
function paramType(type: ValueType): string {
  return type.endsWith("[]") ? `${cppType(type)}&` : cppType(type);
}

function starterCode(signature: Signature): string {
  const params = signature.params.map((p) => `${paramType(p.type)} ${p.name}`).join(", ");
  return [
    "#include <bits/stdc++.h>",
    "using namespace std;",
    "",
    "class Solution {",
    "public:",
    `    ${cppType(signature.returns)} ${signature.functionName}(${params}) {`,
    "        return {};",
    "    }",
    "};",
    "",
  ].join("\n");
}

// Overloads for every base type plus one template for vectors, so any nesting
// reads and writes itself. Token format: ../wire.ts.
const PRELUDE = String.raw`
#include <bits/stdc++.h>
#include <unistd.h>
namespace nj_driver {
struct In {
  std::string d;
  size_t p = 0;
  std::string next() {
    while (p < d.size() && (unsigned char)d[p] <= ' ') p++;
    size_t s = p;
    while (p < d.size() && (unsigned char)d[p] > ' ') p++;
    return d.substr(s, p - s);
  }
};
inline void read(In& in, int& v) { v = std::stoi(in.next()); }
inline void read(In& in, long long& v) { v = std::stoll(in.next()); }
inline void read(In& in, double& v) { v = std::strtod(in.next().c_str(), nullptr); }
inline void read(In& in, bool& v) { v = in.next() == "true"; }
inline void read(In& in, std::string& v) {
  std::string t = in.next();
  v.clear();
  for (size_t i = 1; i + 1 < t.size(); i += 2) v.push_back((char)std::stoi(t.substr(i, 2), nullptr, 16));
}
template <class T> void read(In& in, std::vector<T>& v) {
  size_t n = std::stoull(in.next());
  v.clear();
  v.reserve(n);
  for (size_t i = 0; i < n; i++) { T x; read(in, x); v.push_back(std::move(x)); }
}
inline void put(std::string& o, int v) { o += std::to_string(v); o += ' '; }
inline void put(std::string& o, long long v) { o += std::to_string(v); o += ' '; }
inline void put(std::string& o, double v) { char b[32]; std::snprintf(b, sizeof b, "%.17g ", v); o += b; }
inline void put(std::string& o, bool v) { o += v ? "true " : "false "; }
inline void put(std::string& o, const std::string& v) {
  static const char* hex = "0123456789abcdef";
  o += 's';
  for (unsigned char c : v) { o += hex[c >> 4]; o += hex[c & 15]; }
  o += ' ';
}
template <class T> void put(std::string& o, const std::vector<T>& v) {
  put(o, (int)v.size());
  for (const T& x : v) put(o, x);
}
inline std::string read_all() {
  std::string d;
  char buf[1 << 16];
  size_t n;
  while ((n = std::fread(buf, 1, sizeof buf, stdin)) > 0) d.append(buf, n);
  return d;
}
}  // namespace nj_driver
`;

/**
 * Appended after the user's code (a class needs its caller in the same file).
 * Before the call, stdout is pointed at stderr with dup2, so cout and printf
 * debugging stays out of the result, which goes to the saved stdout.
 */
function driver(signature: Signature): string {
  const reads = signature.params.flatMap((param, i) => [
    `  ${cppType(param.type).replace(/\bvector\b/g, "std::vector").replace(/\bstring\b/g, "std::string")} nj_a${i};`,
    `  nj_driver::read(nj_in, nj_a${i});`,
  ]);
  const args = signature.params.map((_, i) => `nj_a${i}`).join(", ");
  return [
    PRELUDE,
    "int main() {",
    "  nj_driver::In nj_in{nj_driver::read_all()};",
    ...reads,
    "  int nj_out = dup(1);",
    "  dup2(2, 1);",
    "  Solution nj_solution;",
    `  auto nj_result = nj_solution.${signature.functionName}(${args});`,
    "  std::cout.flush();",
    "  std::fflush(stdout);",
    "  std::string nj_text;",
    "  nj_driver::put(nj_text, nj_result);",
    "  nj_text += '\\n';",
    "  for (size_t done = 0; done < nj_text.size();) {",
    "    ssize_t n = ::write(nj_out, nj_text.data() + done, nj_text.size() - done);",
    "    if (n <= 0) return 1;",
    "    done += n;",
    "  }",
    "  return 0;",
    "}",
    "",
  ].join("\n");
}

/** Runtime errors in C++ carry no file or line; only the GCC compile output does. */
function cleanError(stderr: string): string {
  return stderr.replace(/\r\n/g, "\n").trim();
}

// Must match the flags the runner image precompiles <bits/stdc++.h> with.
const COMPILE = ["g++", "-std=gnu++20", "-O2", "-o", "solution", "solution.cpp"];
// A 1 GB stack, so deep recursion doesn't crash (the memory limit still applies).
const STACK_KB = 1048576;

export const cpp: LanguageSpec = {
  id: "cpp",
  label: "C++",
  version: "C++20 (GCC 15)",
  timeMultiplier: 1,
  image: "runner",
  wire: "tokens",
  starterCode,
  cleanError,
  outOfMemory: /std::bad_alloc/,
  program(judge, source, memoryMb) {
    const code = judge.mode === "function" ? source + "\n" + driver(judge.signature) : source;
    return { files: { "solution.cpp": code }, compile: COMPILE, run: underUlimit("./solution", memoryMb, 64, STACK_KB) };
  },
};
