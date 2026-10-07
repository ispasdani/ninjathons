/**
 * UTC days and ISO weeks, the clocks the daily and weekly challenges run on
 * (decisions §15). Days are "2026-10-07"; weeks are "2026-W41", Monday to
 * Sunday.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC day of a time, "2026-10-07". */
export function dayKey(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

/** Midnight UTC at the start of a day. */
export function dayStart(day: string) {
  return Date.parse(`${day}T00:00:00Z`);
}

/** The day `n` days after `day` (before, when negative). */
export function addDays(day: string, n: number) {
  return dayKey(dayStart(day) + n * DAY_MS);
}

/** Whole days from `a` to `b`: 1 when `b` is the day after `a`. */
export function daysBetween(a: string, b: string) {
  return Math.round((dayStart(b) - dayStart(a)) / DAY_MS);
}

/** 1 for Monday to 7 for Sunday, as in ISO 8601. */
export function isoWeekday(day: string) {
  return new Date(dayStart(day)).getUTCDay() || 7;
}

/** The ISO week a time falls in, "2026-W41". */
export function weekKey(time: number) {
  const day = dayKey(time);
  // The week belongs to the year of its Thursday.
  const thursday = new Date(dayStart(addDays(day, 4 - isoWeekday(day))));
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY_MS / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Midnight UTC on the Monday a week starts. */
export function weekStart(week: string) {
  const [year, w] = week.split("-W").map(Number);
  // 4 January is always in week 1.
  const jan4 = dayKey(Date.UTC(year, 0, 4));
  const monday = addDays(jan4, 1 - isoWeekday(jan4) + (w - 1) * 7);
  return dayStart(monday);
}

/** The week before `week`. */
export function previousWeek(week: string) {
  return weekKey(weekStart(week) - DAY_MS);
}
