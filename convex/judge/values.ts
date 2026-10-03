import type { Signature, ValueType } from "./types";

const INT_MIN = -(2 ** 31);
const INT_MAX = 2 ** 31 - 1;

/**
 * Checks a JSON value against a signature type. Returns null when it fits,
 * otherwise what is wrong. `long` must stay within ±(2^53 − 1): beyond that
 * JavaScript, and so Convex, can't hold the number exactly.
 */
export function checkValue(type: ValueType, value: unknown, path = "value"): string | null {
  if (type.endsWith("[]")) {
    if (!Array.isArray(value)) return `${path} should be an array (${type})`;
    const inner = type.slice(0, -2) as ValueType;
    for (let i = 0; i < value.length; i++) {
      const error = checkValue(inner, value[i], `${path}[${i}]`);
      if (error) return error;
    }
    return null;
  }
  switch (type) {
    case "int":
      return Number.isInteger(value) && (value as number) >= INT_MIN && (value as number) <= INT_MAX
        ? null
        : `${path} should be a 32-bit integer`;
    case "long":
      return Number.isSafeInteger(value) ? null : `${path} should be an integer within ±(2^53 − 1)`;
    case "double":
      return typeof value === "number" && Number.isFinite(value) ? null : `${path} should be a finite number`;
    case "bool":
      return typeof value === "boolean" ? null : `${path} should be true or false`;
    case "string":
      return typeof value === "string" ? null : `${path} should be a string`;
    default:
      return `${path} has unknown type ${type}`;
  }
}

/** Checks that `input` is a JSON object with exactly the signature's parameters. */
export function checkFunctionInput(signature: Signature, input: string): string | null {
  let args: unknown;
  try {
    args = JSON.parse(input);
  } catch {
    return "input is not valid JSON";
  }
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return "input should be a JSON object of arguments";
  }
  const names = signature.params.map((p) => p.name);
  for (const key of Object.keys(args)) {
    if (!names.includes(key)) return `input has an argument the signature doesn't: ${key}`;
  }
  for (const param of signature.params) {
    if (!(param.name in args)) return `input is missing argument ${param.name}`;
    const error = checkValue(param.type, (args as Record<string, unknown>)[param.name], param.name);
    if (error) return `input: ${error}`;
  }
  return null;
}

/** Checks one function-mode test: its input, and that `output` is a JSON value of the return type. */
export function checkFunctionTest(signature: Signature, input: string, output: string): string | null {
  const error = checkFunctionInput(signature, input);
  if (error) return error;
  try {
    return checkValue(signature.returns, JSON.parse(output), "output");
  } catch {
    return "output is not valid JSON";
  }
}
