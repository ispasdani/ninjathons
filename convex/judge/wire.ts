/**
 * The token format the compiled languages' drivers read and write, so none of
 * them needs a JSON parser (JavaScript and Python read JSON natively). The
 * judge converts each test's JSON arguments to tokens before the run and the
 * printed tokens back to JSON after it, so checkers only ever see JSON.
 *
 * Tokens are separated by whitespace:
 * - int, long: decimal. double: shortest round-trip text ("0.1", "1e-7").
 * - bool: true or false.
 * - string: "s" followed by the hex of its UTF-8 bytes ("s" alone is "").
 * - array: its length, then each item (so a 2D array is rows of lengths and items).
 * - null (Java and C# may return a null array or string): null.
 */
import type { Signature, ValueType } from "./types";

// TextEncoder rather than Buffer: Convex's default runtime has no Buffer.
function toHex(text: string): string {
  let hex = "";
  for (const byte of new TextEncoder().encode(text)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function fromHex(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeValue(type: ValueType, value: unknown, out: string[]): void {
  if (type.endsWith("[]")) {
    const items = value as unknown[];
    out.push(String(items.length));
    for (const item of items) encodeValue(type.slice(0, -2) as ValueType, item, out);
    return;
  }
  switch (type) {
    case "string":
      out.push("s" + toHex(value as string));
      return;
    case "bool":
      out.push(value ? "true" : "false");
      return;
    default:
      out.push(String(value));
  }
}

/** A test's JSON arguments ({"nums": [2, 7], "target": 9}) as tokens, in signature order. */
export function encodeArgs(signature: Signature, input: string): string {
  const args = JSON.parse(input) as Record<string, unknown>;
  const out: string[] = [];
  for (const param of signature.params) encodeValue(param.type, args[param.name], out);
  return out.join(" ") + "\n";
}

class DecodeError extends Error {}

function decodeValue(type: ValueType, tokens: string[], at: { i: number }): unknown {
  const token = tokens[at.i++];
  if (token === undefined) throw new DecodeError("the output ended early");
  if (token === "null" && (type.endsWith("[]") || type === "string")) return null;
  if (type.endsWith("[]")) {
    const length = Number(token);
    if (!Number.isSafeInteger(length) || length < 0) throw new DecodeError(`bad array length ${token}`);
    const items: unknown[] = [];
    for (let k = 0; k < length; k++) items.push(decodeValue(type.slice(0, -2) as ValueType, tokens, at));
    return items;
  }
  switch (type) {
    case "string":
      if (!/^s(?:[0-9a-f]{2})*$/.test(token)) throw new DecodeError(`bad string ${token}`);
      return fromHex(token.slice(1));
    case "bool":
      if (token !== "true" && token !== "false") throw new DecodeError(`bad bool ${token}`);
      return token === "true";
    case "double": {
      const n = Number(token);
      // NaN and infinity have no JSON form; they can't be a right answer.
      if (!Number.isFinite(n)) throw new DecodeError(`returned ${token}`);
      return n;
    }
    default: {
      if (!/^-?\d+$/.test(token)) throw new DecodeError(`bad integer ${token}`);
      return Number(token);
    }
  }
}

/**
 * The tokens a driver printed, as the JSON of the return value. Throws an
 * Error saying what is wrong when the output isn't exactly one value.
 */
export function decodeResult(type: ValueType, stdout: string): string {
  const tokens = stdout.trim().split(/\s+/).filter(Boolean);
  const at = { i: 0 };
  const value = decodeValue(type, tokens, at);
  if (at.i !== tokens.length) throw new DecodeError("extra output after the return value");
  return JSON.stringify(value);
}
