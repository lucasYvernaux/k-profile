import { describe, expect, it } from "vitest";
import {
  bmi, bmiCategory, bodyWeightOn, bodyweightInfo, bodyweightRecords, bodyweightTotals, formatSeconds, loadOf, navyBodyFat, volumeOf,
} from "@/features/health/domain/health";
import { workoutSchema } from "@/features/health/health.schemas";
import { channelHref, daysToBirthday, freshness, type Person } from "@/features/network/domain/network";

const person = (overrides: Partial<Person> = {}): Person => ({
  id: 1, firstName: "Ana", lastName: null, nickname: null, gender: null, isSelf: false, intimacy: 5, metAt: null,
  lastSeen: null, lastContact: null, lastContactKind: null, contactEveryDays: null, channels: null, birthday: null,
  deceased: false, diedOn: null, coldSince: null, coldReason: null, notes: null,
  ...overrides,
});

describe("health domain", () => {
  it("computes BMI and its category", () => {
    expect(bmi(72, 180)).toBeCloseTo(22.2, 1);
    expect(bmiCategory(22.2).label).toBe("Corpulence normale");
    expect(bmi(null, 180)).toBeNull();
  });

  it("estimates body fat with the US Navy method", () => {
    expect(navyBodyFat("homme", 180, 38, 85, null)).toBeCloseTo(16.5, 0);
    expect(navyBodyFat("femme", 165, 32, 75, null)).toBeNull(); // hips required
  });

  it("sums the lifted volume", () => {
    expect(volumeOf([{ name: "Squat", sets: 3, reps: 5, weight: 100 }, { name: "Gainage", sets: 3, reps: null, weight: null }])).toBe(1500);
  });
});

describe("bodyweight training", () => {
  const pushups = { name: "Pompes", sets: 3, reps: 20, weight: null, bw: true };
  const weightedPullups = { name: "Tractions", sets: 4, reps: 8, weight: 10, bw: true };
  const assistedDips = { name: "dips", sets: 3, reps: 10, weight: -20, bw: true };
  const plank = { name: "Gainage", sets: 3, reps: null, weight: null, bw: true, seconds: 60 };

  it("estimates the load from the body weight, the exercise and the added load", () => {
    expect(loadOf(pushups, 80)).toBeCloseTo(51.2); // 64 %
    expect(loadOf(weightedPullups, 80)).toBe(90); // 100 % + 10 kg lest
    expect(loadOf(assistedDips, 80)).toBeCloseTo(56); // 95 % - 20 kg assistance, name matched without case
    expect(loadOf({ name: "Mon exo", sets: 1, reps: 1, weight: null, bw: true }, 100)).toBe(65); // default ratio
    expect(loadOf(pushups, null)).toBe(0); // unknown body weight
  });

  it("adds bodyweight work to the tonnage, but not holds", () => {
    expect(volumeOf([pushups, plank], 80)).toBeCloseTo(3 * 20 * 51.2);
    expect(volumeOf([{ name: "Squat", sets: 1, reps: 1, weight: 100 }], 80)).toBe(100); // weighted exercises unchanged
  });

  it("totals reps and hold time", () => {
    expect(bodyweightTotals([pushups, weightedPullups, plank])).toEqual({ reps: 92, seconds: 180 });
    expect(formatSeconds(45)).toBe("45 s");
    expect(formatSeconds(90)).toBe("1 min 30");
  });

  it("uses the latest known body weight at the session date", () => {
    const rows = [{ date: "2026-10-01", weightKg: 80 }, { date: "2026-11-01", weightKg: 78 }, { date: "2026-11-03", weightKg: null }];
    expect(bodyWeightOn(rows, "2026-11-05")).toBe(78);
    expect(bodyWeightOn(rows, "2026-10-15")).toBe(80);
    expect(bodyWeightOn(rows, "2026-01-01")).toBe(80); // before any measure: first one
    expect(bodyWeightOn([], "2026-01-01")).toBeNull();
  });

  it("keeps the best set per exercise as a record", () => {
    const sessions = [
      { date: "2026-10-01", exercises: JSON.stringify([{ ...pushups, reps: 25 }, plank]) },
      { date: "2026-11-01", exercises: JSON.stringify([pushups, { ...plank, seconds: 90 }]) },
    ];
    const records = bodyweightRecords(sessions);
    expect(records.find((r) => r.name === "Pompes")).toMatchObject({ best: 25, unit: "reps", date: "2026-10-01" });
    expect(records.find((r) => r.name === "Gainage")).toMatchObject({ best: 90, unit: "s", date: "2026-11-01" });
  });

  it("recognises catalogue exercises, accents and case aside", () => {
    expect(bodyweightInfo("pompes declinees")?.ratio).toBe(0.74);
    expect(bodyweightInfo("L-SIT")?.timed).toBe(true);
    expect(bodyweightInfo("Développé couché")).toBeUndefined();
  });

  it("validates bodyweight fields", () => {
    const parsed = workoutSchema.parse({ type: "poids_corps", exercises: [{ name: "Tractions", sets: "4", reps: "8", weight: "-15", bw: true, seconds: "" }] });
    expect(parsed.exercises?.[0]).toMatchObject({ bw: true, weight: -15, seconds: null });
    expect(workoutSchema.safeParse({ exercises: [{ name: "x", weight: -500 }] }).success).toBe(false);
  });
});

describe("network domain", () => {
  it("flags people past their contact cadence", () => {
    expect(freshness(person({ lastContact: "2026-11-01" }), "2026-11-05").status).toBe("ok");
    expect(freshness(person({ lastContact: "2026-10-20" }), "2026-11-05").status).toBe("late");
    expect(freshness(person({ intimacy: 1 }), "2026-11-05").status).toBe("none");
  });

  it("pauses reminders when on ice, deceased or for my own record", () => {
    expect(freshness(person({ lastContact: "2026-01-01", coldSince: "2026-10-01" }), "2026-11-05").status).toBe("cold");
    expect(freshness(person({ deceased: true }), "2026-11-05").status).toBe("none");
    expect(freshness(person({ isSelf: true }), "2026-11-05").status).toBe("none");
  });

  it("computes days to the next birthday across the year end", () => {
    expect(daysToBirthday("1990-01-02", "2026-12-31")).toBe(2);
  });

  it("only builds safe contact links", () => {
    expect(channelHref({ kind: "whatsapp", value: "+33 6 12 34 56 78" })).toBe("https://wa.me/33612345678");
    expect(channelHref({ kind: "autre", value: "javascript:alert(1)" })).toBeUndefined();
    expect(channelHref({ kind: "mail", value: "javascript:alert(1)" })).toBe("mailto:javascript:alert(1)");
  });
});

describe("water percent of the daily goal", () => {
  it("is a finite 0-100 value, even when the goal is 0", async () => {
    const { waterPercent } = await import("@/features/intake/domain/intake");
    expect(waterPercent(1250, 2000)).toBe(62.5);
    expect(waterPercent(3000, 2000)).toBe(100);
    // Goal 0 (allowed by the config schema) used to give NaN and an endless gauge animation.
    expect(waterPercent(0, 0)).toBe(0);
    expect(waterPercent(500, 0)).toBe(100);
  });
});
