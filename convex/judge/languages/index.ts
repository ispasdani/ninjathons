import { javascript } from "./javascript";
import { python } from "./python";
import type { LanguageSpec } from "./types";
import type { Language } from "../types";

export type { LanguageSpec } from "./types";

export const LANGUAGES: Record<Language, LanguageSpec> = { javascript, python };

/** File extension of solutions in problems/<slug>/solutions. */
export const EXTENSIONS: Record<Language, string> = { javascript: "js", python: "py" };

/** The languages a problem can be solved in, in display order. */
export function problemLanguages(languages: "all" | Language[]): Language[] {
  const all = Object.keys(LANGUAGES) as Language[];
  return languages === "all" ? all : all.filter((l) => languages.includes(l));
}
