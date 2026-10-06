import { underUlimit } from "./limits";
import type { LanguageSpec } from "./types";
import type { Signature, ValueType } from "../types";

/** twoSum → two_sum, getURL → get_url. Python code uses snake_case names. */
export function snakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function pyType(type: ValueType): string {
  if (type.endsWith("[]")) return `list[${pyType(type.slice(0, -2) as ValueType)}]`;
  switch (type) {
    case "double":
      return "float";
    case "bool":
      return "bool";
    case "string":
      return "str";
    default:
      return "int";
  }
}

function starterCode(signature: Signature): string {
  const params = signature.params.map((p) => `${snakeCase(p.name)}: ${pyType(p.type)}`).join(", ");
  return `def ${snakeCase(signature.functionName)}(${params}) -> ${pyType(signature.returns)}:\n    pass\n`;
}

/**
 * Appended after the user's code. Finds the function under its snake_case or
 * original name, or as a method of a LeetCode-style `class Solution`. Anything
 * the solution prints goes to stderr; stdout gets only the JSON result.
 */
function driver(signature: Signature): string {
  const names = [...new Set([snakeCase(signature.functionName), signature.functionName])];
  const args = signature.params.map((p) => `__args[${JSON.stringify(p.name)}]`).join(", ");
  return `

def __nj_main():
    import json, sys
    __args = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    __fn = None
    for __name in ${JSON.stringify(names)}:
        __fn = globals().get(__name)
        if __fn is None and "Solution" in globals():
            __fn = getattr(globals()["Solution"](), __name, None)
        if __fn is not None:
            break
    if __fn is None:
        raise NameError("function ${names[0]} is not defined")
    __out = sys.stdout
    sys.stdout = sys.stderr
    __result = __fn(${args})
    sys.stdout = __out
    __out.write(json.dumps(__result, default=list) + "\\n")


__nj_main()
`;
}

/** Drops traceback frames in the driver (and their code lines) and renames the file. */
function cleanError(stderr: string, sourceLines: number): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of stderr.replace(/\r\n/g, "\n").split("\n")) {
    const frame = line.match(/^ {2}File "([^"]*)", line (\d+)/);
    if (frame) {
      skipping = /main\.py$/.test(frame[1]) && Number(frame[2]) > sourceLines;
      if (!skipping) out.push(line.replace(frame[1], "solution.py"));
      continue;
    }
    if (skipping && line.startsWith("    ")) continue;
    skipping = false;
    out.push(line);
  }
  return out.join("\n").trim();
}

export const python: LanguageSpec = {
  id: "python",
  label: "Python",
  version: "Python 3.14",
  // CPython is roughly 2x slower than Node on typical problems.
  timeMultiplier: 2,
  image: "managed",
  starterCode,
  stdioTemplate: "import sys\n\ndata = sys.stdin.read().split()\n\n# Solve it here and print the answer.\n",
  cleanError,
  outOfMemory: /\bMemoryError\b/,
  program(judge, source, memoryMb) {
    const code = judge.mode === "function" ? source + driver(judge.signature) : source;
    return {
      files: { "main.py": code },
      // Headroom for the interpreter itself.
      run: underUlimit("python3 main.py", memoryMb, 128),
    };
  },
};
