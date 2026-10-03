import type { LanguageSpec } from "./types";
import type { Signature, ValueType } from "../types";

function jsType(type: ValueType): string {
  if (type.endsWith("[]")) return `${jsType(type.slice(0, -2) as ValueType)}[]`;
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
  const docs = [
    "/**",
    ...signature.params.map((p) => ` * @param {${jsType(p.type)}} ${p.name}`),
    ` * @return {${jsType(signature.returns)}}`,
    " */",
  ];
  const params = signature.params.map((p) => p.name).join(", ");
  return `${docs.join("\n")}\nfunction ${signature.functionName}(${params}) {\n  \n}\n`;
}

/**
 * The user's code comes first so error line numbers match the editor. The
 * driver then reads the arguments from stdin, sends anything the solution
 * prints to stderr, and writes only the JSON result to stdout.
 */
function driver(signature: Signature): string {
  const args = signature.params.map((p) => `__args[${JSON.stringify(p.name)}]`).join(", ");
  return `
;(() => {
  const __fs = process.getBuiltinModule("fs");
  const __args = JSON.parse(__fs.readFileSync(0, "utf8"));
  const __write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (...a) => process.stderr.write(...a);
  const __result = ${signature.functionName}(${args});
  __write(JSON.stringify(__result === undefined ? null : __result) + "\\n");
})();
`;
}

/**
 * Drops Node's internal stack frames, frames in the driver and the "Node.js
 * vXX" footer. When the error is thrown inside the driver (the function is
 * missing), the code snippet Node prints above the message is the driver's,
 * so it goes too.
 */
function cleanError(stderr: string, sourceLines: number): string {
  const lines = stderr.replace(/\r\n/g, "\n").split("\n");
  const header = lines[0]?.match(/main\.js:(\d+)$/);
  if (header && Number(header[1]) > sourceLines) lines.splice(0, 3);
  return lines
    .filter((line) => {
      if (/^Node\.js v\d/.test(line)) return false;
      if (!/^\s+at\s/.test(line)) return true;
      const frame = line.match(/main\.js:(\d+):\d+/);
      return frame !== null && Number(frame[1]) <= sourceLines;
    })
    .join("\n")
    .replace(/[^\s()]*main\.js/g, "solution.js")
    .trim();
}

export const javascript: LanguageSpec = {
  id: "javascript",
  label: "JavaScript",
  // Node.js 24, the same major in Vercel Sandbox and locally.
  version: "Node.js 24",
  timeMultiplier: 1,
  starterCode,
  cleanError,
  program(judge, source) {
    const code = judge.mode === "function" ? source + "\n" + driver(judge.signature) : source;
    return {
      files: { "main.js": code },
      run: ["node", "main.js"],
    };
  },
};
