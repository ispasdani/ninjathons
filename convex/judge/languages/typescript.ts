import { driver, nodeCleanError } from "./javascript";
import type { LanguageSpec } from "./types";
import type { Signature, ValueType } from "../types";

function tsType(type: ValueType): string {
  if (type.endsWith("[]")) return `${tsType(type.slice(0, -2) as ValueType)}[]`;
  switch (type) {
    case "bool":
      return "boolean";
    case "string":
      return "string";
    default:
      return "number";
  }
}

function starterCode(signature: Signature): string {
  const params = signature.params.map((p) => `${p.name}: ${tsType(p.type)}`).join(", ");
  return `function ${signature.functionName}(${params}): ${tsType(signature.returns)} {\n  \n}\n`;
}

/**
 * Node.js runs TypeScript itself by stripping the types: no compile step, so
 * it starts as fast as JavaScript, and the JavaScript driver works unchanged.
 * Types aren't checked, and syntax that needs more than stripping (enum,
 * namespace, parameter properties) is a syntax error, as in Node.
 */
export const typescript: LanguageSpec = {
  id: "typescript",
  label: "TypeScript",
  version: "TypeScript (Node.js 24)",
  timeMultiplier: 1,
  image: "managed",
  starterCode,
  cleanError: (stderr, sourceLines) => nodeCleanError(stderr, sourceLines, "ts"),
  outOfMemory: /heap out of memory/,
  program(judge, source, memoryMb) {
    const code = judge.mode === "function" ? source + "\n" + driver(judge.signature) : source;
    return {
      files: { "main.ts": code },
      run: ["node", `--max-old-space-size=${memoryMb}`, "main.ts"],
    };
  },
};
