import { COUNTRY_CODES } from "@/convex/lib/countries";

const names = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string) {
  return names.of(code) ?? code;
}

/** Every country, sorted by its English name. */
export const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
  a.name.localeCompare(b.name),
);
