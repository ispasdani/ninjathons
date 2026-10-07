import { describe, expect, it } from "vitest";

import { addDays, dayKey, daysBetween, isoWeekday, previousWeek, weekKey, weekStart } from "./days";

describe("days", () => {
  it("keys days in UTC", () => {
    expect(dayKey(Date.parse("2026-10-07T23:59:59Z"))).toBe("2026-10-07");
    expect(dayKey(Date.parse("2026-10-08T00:00:00Z"))).toBe("2026-10-08");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-05", "2026-10-07")).toBe(2);
  });

  it("numbers weekdays from Monday", () => {
    expect(isoWeekday("2026-10-05")).toBe(1); // Monday
    expect(isoWeekday("2026-10-11")).toBe(7); // Sunday
  });

  it("keys ISO weeks, including across years", () => {
    expect(weekKey(Date.parse("2026-10-07T12:00:00Z"))).toBe("2026-W41");
    expect(weekKey(Date.parse("2026-10-11T23:59:59Z"))).toBe("2026-W41");
    expect(weekKey(Date.parse("2026-10-12T00:00:00Z"))).toBe("2026-W42");
    // 1 Jan 2027 is a Friday, so it's in 2026's last week.
    expect(weekKey(Date.parse("2027-01-01T00:00:00Z"))).toBe("2026-W53");
    expect(weekKey(Date.parse("2027-01-04T00:00:00Z"))).toBe("2027-W01");
    // 29 Dec 2025 is a Monday in 2026's first week.
    expect(weekKey(Date.parse("2025-12-29T00:00:00Z"))).toBe("2026-W01");
  });

  it("finds a week's Monday and the week before", () => {
    expect(new Date(weekStart("2026-W41")).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(new Date(weekStart("2026-W01")).toISOString()).toBe("2025-12-29T00:00:00.000Z");
    expect(previousWeek("2027-W01")).toBe("2026-W53");
  });
});
