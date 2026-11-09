import { describe, expect, it } from "vitest";
import { APP_TIME_ZONE, zonedNow } from "@/server/time";

describe("zonedNow (business clock in Europe/Paris)", () => {
  it("uses the Paris time zone", () => {
    expect(APP_TIME_ZONE).toBe("Europe/Paris");
  });

  it("is already the next day in Paris shortly after midnight (winter, UTC+1)", () => {
    // 2026-01-15 23:30 UTC = 2026-01-16 00:30 in Paris.
    expect(zonedNow(new Date("2026-01-15T23:30:00Z"))).toEqual({ dateKey: "2026-01-16", hour: 0, minute: 30 });
  });

  it("is already the next day in Paris shortly after midnight (summer, UTC+2)", () => {
    // 2026-07-15 22:15 UTC = 2026-07-16 00:15 in Paris.
    expect(zonedNow(new Date("2026-07-15T22:15:00Z"))).toEqual({ dateKey: "2026-07-16", hour: 0, minute: 15 });
  });

  it("keeps the same day during the day", () => {
    expect(zonedNow(new Date("2026-03-10T11:05:00Z"))).toEqual({ dateKey: "2026-03-10", hour: 12, minute: 5 });
  });
});
