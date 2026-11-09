import { describe, expect, it } from "vitest";
import { addDays, type DayKey } from "@/domain/dates";
import {
  assertCanActivate,
  completionRate,
  consecutiveMissedDays,
  HabitLimitError,
  isStable,
  missNudge,
  planProgression,
  type CheckIn,
  type Habit,
} from "@/domain/habits";

const START: DayKey = "2026-01-05";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    title: "Lever fixe",
    pillar: "body",
    cadence: { kind: "daily" },
    status: "forming",
    queueOrder: 1,
    activatedOn: START,
    ...overrides,
  };
}

/** Check-ins on every day of [from, from + count) except the skipped offsets. */
function dailyCheckIns(habitId: string, from: DayKey, count: number, skip: number[] = []): CheckIn[] {
  return Array.from({ length: count }, (_, offset) => offset)
    .filter((offset) => !skip.includes(offset))
    .map((offset) => ({ habitId, day: addDays(from, offset) }));
}

describe("completionRate", () => {
  it("returns null before activation", () => {
    expect(completionRate(habit(), [], "2026-01-01")).toBeNull();
  });

  it("only counts days since activation", () => {
    const checkIns = dailyCheckIns("h1", START, 10, [0, 1]);
    expect(completionRate(habit(), checkIns, addDays(START, 9))).toBe(0.8);
  });

  it("caps weekly sessions so extra sessions do not hide a missed week", () => {
    const weekly = habit({ cadence: { kind: "weekly", timesPerWeek: 3 } });
    // Week 1: 6 sessions, week 2: 0 sessions.
    const checkIns = dailyCheckIns("h1", START, 6);
    expect(completionRate(weekly, checkIns, addDays(START, 13))).toBe(0.5);
  });

  it("returns null for a weekly habit active for less than a full week", () => {
    const weekly = habit({ cadence: { kind: "weekly", timesPerWeek: 1 } });
    expect(completionRate(weekly, [], addDays(START, 3))).toBeNull();
  });
});

describe("isStable", () => {
  const today = addDays(START, 42);

  it("is not stable before 6 full weeks, even at 100 %", () => {
    const checkIns = dailyCheckIns("h1", START, 41);
    expect(isStable(habit(), checkIns, addDays(START, 41))).toBe(false);
  });

  it("is stable at exactly 80 % over 6 weeks", () => {
    const skipped = Array.from({ length: 8 }, (_, index) => index * 5); // 8 misses out of 42 → 34/42 ≈ 81 %
    const checkIns = dailyCheckIns("h1", START, 42, skipped);
    expect(isStable(habit(), checkIns, today)).toBe(true);
  });

  it("is not stable under 80 %", () => {
    const skipped = Array.from({ length: 9 }, (_, index) => index * 4); // 33/42 ≈ 78.6 %
    const checkIns = dailyCheckIns("h1", START, 42, skipped);
    expect(isStable(habit(), checkIns, today)).toBe(false);
  });

  it("ignores today, which is not over yet", () => {
    const checkIns = dailyCheckIns("h1", START, 42);
    expect(isStable(habit(), checkIns, today)).toBe(true);
  });
});

describe("planProgression", () => {
  const habits: Habit[] = [
    habit({ id: "a", queueOrder: 1 }),
    habit({ id: "b", queueOrder: 2 }),
    habit({ id: "c", status: "locked", activatedOn: null, queueOrder: 4 }),
    habit({ id: "d", status: "locked", activatedOn: null, queueOrder: 3 }),
  ];

  it("unlocks nothing while two habits are forming", () => {
    expect(planProgression(habits, [], addDays(START, 10))).toEqual({
      toStabilize: [],
      unlockable: [],
    });
  });

  it("unlocks the next habit in queue order once one becomes stable", () => {
    const checkIns = dailyCheckIns("a", START, 42);
    expect(planProgression(habits, checkIns, addDays(START, 42))).toEqual({
      toStabilize: ["a"],
      unlockable: ["d"],
    });
  });

  it("fills both slots when no habit is forming", () => {
    const paused = habits.map((item) =>
      item.status === "forming" ? { ...item, status: "paused" as const } : item,
    );
    expect(planProgression(paused, [], START).unlockable).toEqual(["d", "c"]);
  });
});

describe("assertCanActivate", () => {
  it("refuses a third forming habit", () => {
    const habits = [
      habit({ id: "a" }),
      habit({ id: "b" }),
      habit({ id: "c", status: "locked", activatedOn: null }),
    ];
    expect(() => assertCanActivate(habits, "c")).toThrow(HabitLimitError);
  });

  it("allows activation when a slot is free", () => {
    const habits = [habit({ id: "a" }), habit({ id: "c", status: "locked", activatedOn: null })];
    expect(() => assertCanActivate(habits, "c")).not.toThrow();
  });
});

describe("never miss twice", () => {
  const today = addDays(START, 10);

  it("does not nudge when yesterday was done", () => {
    const checkIns = dailyCheckIns("h1", START, 10);
    expect(missNudge(habit(), checkIns, today)).toBe("none");
  });

  it("reminds not to miss twice after one missed day", () => {
    const checkIns = dailyCheckIns("h1", START, 9);
    expect(missNudge(habit(), checkIns, today)).toBe("never-miss-twice");
  });

  it("suggests a gentle restart after two or more missed days", () => {
    const checkIns = dailyCheckIns("h1", START, 7);
    expect(consecutiveMissedDays(habit(), checkIns, today)).toBe(3);
    expect(missNudge(habit(), checkIns, today)).toBe("gentle-restart");
  });

  it("never counts days before activation", () => {
    expect(consecutiveMissedDays(habit(), [], addDays(START, 1))).toBe(1);
  });

  it("does not apply to weekly habits", () => {
    const weekly = habit({ cadence: { kind: "weekly", timesPerWeek: 2 } });
    expect(missNudge(weekly, [], today)).toBe("none");
  });
});
