import { cpp } from "./cpp";
import { csharp } from "./csharp";
import { java } from "./java";
import { javascript } from "./javascript";
import { python } from "./python";
import { rust } from "./rust";
import { typescript } from "./typescript";
import type { LanguageSpec } from "./types";
import type { Language } from "../types";

export type { LanguageSpec } from "./types";

// In display order.
export const LANGUAGES: Record<Language, LanguageSpec> = { javascript, typescript, python, java, csharp, cpp, rust };

/** File extension of solutions in problems/<slug>/solutions. */
export const EXTENSIONS: Record<Language, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  csharp: "cs",
  cpp: "cpp",
  rust: "rs",
};

/** The languages a problem can be solved in, in display order. */
export function problemLanguages(languages: "all" | Language[]): Language[] {
  const all = Object.keys(LANGUAGES) as Language[];
  return languages === "all" ? all : all.filter((l) => languages.includes(l));
}
