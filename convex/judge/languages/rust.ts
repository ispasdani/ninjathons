import { underUlimit } from "./limits";
import { snakeCase } from "./python";
import type { LanguageSpec } from "./types";
import type { Signature, ValueType } from "../types";

const BASE: Record<string, { rust: string; zero: string }> = {
  int: { rust: "i32", zero: "0" },
  long: { rust: "i64", zero: "0" },
  double: { rust: "f64", zero: "0.0" },
  bool: { rust: "bool", zero: "false" },
  string: { rust: "String", zero: "String::new()" },
};

function rustType(type: ValueType): string {
  if (type.endsWith("[]")) return `Vec<${rustType(type.slice(0, -2) as ValueType)}>`;
  return BASE[type].rust;
}

function zero(type: ValueType): string {
  return type.endsWith("[]") ? "vec![]" : BASE[type].zero;
}

/** LeetCode's shape: an `impl Solution` block; the driver declares the struct. */
function starterCode(signature: Signature): string {
  const params = signature.params.map((p) => `${snakeCase(p.name)}: ${rustType(p.type)}`).join(", ");
  return [
    "impl Solution {",
    `    pub fn ${snakeCase(signature.functionName)}(${params}) -> ${rustType(signature.returns)} {`,
    `        ${zero(signature.returns)}`,
    "    }",
    "}",
    "",
  ].join("\n");
}

// Read and Write traits for every base type plus Vec<T>, so any nesting works.
// Token format: ../wire.ts. The standard library has no dup2, so it comes
// straight from libc, which every Rust program links anyway.
const PRELUDE = String.raw`
pub struct Solution;

mod nj_driver {
    use std::fmt::Write as _;

    pub struct In<'a>(std::str::SplitAsciiWhitespace<'a>);
    impl<'a> In<'a> {
        pub fn new(text: &'a str) -> Self { In(text.split_ascii_whitespace()) }
        fn next(&mut self) -> &'a str { self.0.next().expect("input ended early") }
    }

    pub trait Read: Sized { fn read(input: &mut In) -> Self; }
    impl Read for i32 { fn read(input: &mut In) -> Self { input.next().parse().unwrap() } }
    impl Read for i64 { fn read(input: &mut In) -> Self { input.next().parse().unwrap() } }
    impl Read for f64 { fn read(input: &mut In) -> Self { input.next().parse().unwrap() } }
    impl Read for bool { fn read(input: &mut In) -> Self { input.next() == "true" } }
    impl Read for String {
        fn read(input: &mut In) -> Self {
            let t = &input.next()[1..];
            let bytes = (0..t.len() / 2).map(|i| u8::from_str_radix(&t[2 * i..2 * i + 2], 16).unwrap()).collect();
            String::from_utf8(bytes).unwrap()
        }
    }
    impl<T: Read> Read for Vec<T> {
        fn read(input: &mut In) -> Self {
            let n: usize = input.next().parse().unwrap();
            (0..n).map(|_| T::read(input)).collect()
        }
    }

    pub trait Put { fn put(&self, out: &mut String); }
    impl Put for i32 { fn put(&self, out: &mut String) { let _ = write!(out, "{} ", self); } }
    impl Put for i64 { fn put(&self, out: &mut String) { let _ = write!(out, "{} ", self); } }
    impl Put for f64 { fn put(&self, out: &mut String) { let _ = write!(out, "{:?} ", self); } }
    impl Put for bool { fn put(&self, out: &mut String) { out.push_str(if *self { "true " } else { "false " }); } }
    impl Put for String {
        fn put(&self, out: &mut String) {
            out.push('s');
            for b in self.as_bytes() { let _ = write!(out, "{:02x}", b); }
            out.push(' ');
        }
    }
    impl<T: Put> Put for Vec<T> {
        fn put(&self, out: &mut String) {
            let _ = write!(out, "{} ", self.len());
            for x in self { x.put(out); }
        }
    }

    unsafe extern "C" {
        fn dup(fd: i32) -> i32;
        fn dup2(from: i32, to: i32) -> i32;
    }

    /// Points stdout at stderr, so the solution's prints stay out of the
    /// result, and returns the real stdout for the result.
    pub fn take_stdout() -> std::fs::File {
        use std::os::unix::io::FromRawFd;
        unsafe {
            let fd = dup(1);
            dup2(2, 1);
            std::fs::File::from_raw_fd(fd)
        }
    }
}
`;

/** Appended after the user's code: the impl block needs the struct in the same crate. */
function driver(signature: Signature): string {
  const reads = signature.params.map(
    (param, i) => `    let nj_a${i}: ${rustType(param.type)} = nj_driver::Read::read(&mut nj_in);`,
  );
  const args = signature.params.map((_, i) => `nj_a${i}`).join(", ");
  return [
    PRELUDE,
    "fn main() {",
    "    let mut nj_text = String::new();",
    "    std::io::Read::read_to_string(&mut std::io::stdin(), &mut nj_text).unwrap();",
    "    let mut nj_in = nj_driver::In::new(&nj_text);",
    ...reads,
    "    let mut nj_out = nj_driver::take_stdout();",
    `    let nj_result = Solution::${snakeCase(signature.functionName)}(${args});`,
    "    let mut nj_result_text = String::new();",
    "    nj_driver::Put::put(&nj_result, &mut nj_result_text);",
    "    nj_result_text.push('\\n');",
    "    std::io::Write::write_all(&mut nj_out, nj_result_text.as_bytes()).unwrap();",
    "}",
    "",
  ].join("\n");
}

/** Drops the backtrace hint; panics in the driver itself don't happen with valid tests. */
function cleanError(stderr: string): string {
  return stderr
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.startsWith("note: run with `RUST_BACKTRACE=1`"))
    .join("\n")
    .trim();
}

export const rust: LanguageSpec = {
  id: "rust",
  label: "Rust",
  version: "Rust 1.99",
  timeMultiplier: 1,
  image: "runner",
  wire: "tokens",
  starterCode,
  stdioTemplate: "use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let mut tokens = input.split_ascii_whitespace();\n    // Solve it here and print the answer with println!.\n}\n",
  cleanError,
  outOfMemory: /memory allocation of \d+ bytes failed/,
  program(judge, source, memoryMb) {
    const code = judge.mode === "function" ? source + "\n" + driver(judge.signature) : source;
    return {
      files: { "solution.rs": code },
      // Release mode, so integer overflow wraps instead of panicking, as in C++.
      // Warnings would bury real errors in the compile output.
      compile: ["rustc", "--edition", "2024", "-O", "-A", "warnings", "-o", "solution", "solution.rs"],
      // A 1 GB stack for deep recursion; the memory limit still applies.
      run: underUlimit("./solution", memoryMb, 64, 1048576),
    };
  },
};
