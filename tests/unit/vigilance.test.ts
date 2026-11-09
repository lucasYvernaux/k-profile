import { describe, expect, it } from "vitest";
import { addDays } from "@/domain/dates";
import type { Habit } from "@/domain/habits";
import {
  alcoholSignals,
  describeSignal,
  shortSleepStreak,
  vigilanceSignals,
  type DailyLog,
} from "@/domain/vigilance";

const today = "2026-11-09";

function log(offset: number, values: Partial<DailyLog>): DailyLog {
  return { day: addDays(today, -offset), sleepHours: null, drinks: null, ...values };
}

describe("sleep", () => {
  it("counts consecutive short nights", () => {
    const logs = [log(0, { sleepHours: 5 }), log(1, { sleepHours: 5.5 }), log(2, { sleepHours: 4 }), log(3, { sleepHours: 8 })];
    expect(shortSleepStreak(logs, today)).toBe(3);
  });

  it("starts from yesterday when today is not recorded yet", () => {
    const logs = [log(1, { sleepHours: 5 }), log(2, { sleepHours: 5 })];
    expect(shortSleepStreak(logs, today)).toBe(2);
  });

  it("stops at a missing night", () => {
    const logs = [log(0, { sleepHours: 5 }), log(2, { sleepHours: 5 })];
    expect(shortSleepStreak(logs, today)).toBe(1);
  });
});

describe("alcohol", () => {
  it("flags more than 2 drinks in a day", () => {
    expect(alcoholSignals([log(0, { drinks: 3 })], today)).toEqual([
      { kind: "alcohol-day", day: today, drinks: 3 },
    ]);
  });

  it("flags more than 10 drinks in 7 days", () => {
    const logs = Array.from({ length: 6 }, (_, offset) => log(offset, { drinks: 2 }));
    expect(alcoholSignals(logs, today)).toContainEqual({ kind: "alcohol-week", drinks: 12 });
  });

  it("flags a week without any alcohol-free day", () => {
    const logs = Array.from({ length: 7 }, (_, offset) => log(offset, { drinks: 1 }));
    expect(alcoholSignals(logs, today)).toEqual([{ kind: "alcohol-no-free-day" }]);
  });

  it("stays silent within the guidelines", () => {
    const logs = [log(0, { drinks: 2 }), log(1, { drinks: 0 }), log(2, { drinks: 2 })];
    expect(alcoholSignals(logs, today)).toEqual([]);
  });
});

describe("vigilanceSignals", () => {
  const habit: Habit = {
    id: "h",
    title: "Journal du soir",
    pillar: "mental",
    cadence: { kind: "daily" },
    status: "forming",
    queueOrder: 1,
    activatedOn: "2026-10-01",
  };

  it("combines family silence and missed days with kind wording", () => {
    const signals = vigilanceSignals({
      today,
      logs: [],
      habits: [habit],
      checkIns: [{ habitId: "h", day: addDays(today, -4) }],
      lastFamilyActivity: "2026-10-12",
      programStart: "2026-10-01",
    });
    expect(signals).toEqual([
      { kind: "family-silence", weeks: 4 },
      { kind: "missed-days", habitTitle: "Journal du soir", days: 3 },
    ]);
    for (const signal of signals) {
      const text = Object.values(describeSignal(signal)).join(" ").toLowerCase();
      expect(text).not.toMatch(/échec total|honte|nul|tu as cassé|série perdue/);
    }
  });

  it("does not nudge after only two missed days", () => {
    const signals = vigilanceSignals({
      today,
      logs: [],
      habits: [habit],
      checkIns: [{ habitId: "h", day: addDays(today, -3) }],
      lastFamilyActivity: today,
      programStart: "2026-10-01",
    });
    expect(signals).toEqual([]);
  });
});
