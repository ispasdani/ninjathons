"use client";

import type { Language } from "@/convex/judge/types";
import { cn } from "@/lib/utils";

// The languages a match can be played in (decisions §8).
export const MATCH_LANGUAGES: [Language, string][] = [
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["java", "Java"],
  ["csharp", "C#"],
  ["cpp", "C++"],
  ["rust", "Rust"],
];

const LANGUAGE_KEY = "play:language";

/** The language last picked on Play, so every match page starts with it. */
export function savedLanguage(): Language | null {
  try {
    return localStorage.getItem(LANGUAGE_KEY) as Language | null;
  } catch {
    return null;
  }
}

export function saveLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {}
}

/** One button per language; the picked one is outlined. */
export function LanguagePicker({
  value,
  onChange,
  disabled,
}: {
  value: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[13px] font-medium" id="language-label">
        Your language
      </p>
      <div role="radiogroup" aria-labelledby="language-label" className="mt-3 flex flex-wrap gap-2">
        {MATCH_LANGUAGES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => {
              saveLanguage(id);
              onChange(id);
            }}
            disabled={disabled}
            className={cn(
              "h-8 rounded-md border px-3 text-[13px] text-muted-foreground transition-colors duration-150 ease-out-quad hover:border-border-strong hover:text-foreground",
              "aria-checked:border-foreground aria-checked:font-medium aria-checked:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
