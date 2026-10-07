import { COUNTRY_CODES } from "@/convex/lib/countries";

const names = new Intl.DisplayNames(["en"], { type: "region" });

// Codes some browsers return unnamed (Edge gives "EH" back as is).
const FALLBACK_NAMES: Record<string, string> = { EH: "Western Sahara" };

export function countryName(code: string) {
  const name = names.of(code);
  return name && name !== code ? name : (FALLBACK_NAMES[code] ?? code);
}

/** Every country, sorted by its English name. */
export const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
  a.name.localeCompare(b.name),
);
