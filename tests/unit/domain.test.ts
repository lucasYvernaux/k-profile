import { describe, expect, it } from "vitest";
import {
  DEFAULT_MICRO_THRESHOLDS_2026,
  microThresholdsSchema,
  savingsMonths,
  thresholdStatuses,
} from "@/domain/business";
import { addMonths, isDayKey, quarterBounds, quarterKey, toDayKey } from "@/domain/dates";
import { emotionFrequencies, journalDaysByMonth, journalEntrySchema } from "@/domain/emotions";
import { currentPhase, phaseWindows } from "@/domain/roadmap";
import { pendingReviewQuarter, scoreSeries } from "@/domain/review";
import { currentBlockIndex, DEFAULT_SCHEDULE, scheduleBlockSchema } from "@/domain/schedule";

describe("dates", () => {
  it("validates real calendar days only", () => {
    expect(isDayKey("2026-02-28")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-2-1")).toBe(false);
  });

  it("uses the user's time zone to pick the day", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Paris.
    expect(toDayKey(new Date("2026-12-31T23:30:00Z"), "Europe/Paris")).toBe("2027-01-01");
  });

  it("clamps month arithmetic to the end of the month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("computes quarters", () => {
    expect(quarterKey("2026-11-09")).toBe("2026-Q4");
    expect(quarterBounds("2026-Q1")).toEqual({ start: "2026-01-01", end: "2026-03-31" });
  });
});

describe("roadmap", () => {
  const start = "2026-01-01";

  it("starts with a two-week audit", () => {
    const [audit, foundations] = phaseWindows(start);
    expect(audit.end).toBe("2026-01-14");
    expect(foundations.start).toBe("2026-01-15");
    expect(foundations.end).toBe("2026-04-14");
  });

  it("finds the current phase", () => {
    expect(currentPhase(start, "2026-01-10").window.phase.id).toBe("audit");
    expect(currentPhase(start, "2026-05-01").window.phase.id).toBe("identity");
    expect(currentPhase(start, "2027-03-01").window.phase.id).toBe("mastery");
  });

  it("stays on the last phase after five years", () => {
    expect(currentPhase(start, "2035-01-01").window.phase.id).toBe("embodiment");
  });
});

describe("emotion journal", () => {
  it("normalises and validates one-word emotions", () => {
    const parsed = journalEntrySchema.parse({
      day: "2026-11-09",
      emotions: [" Fierté ", "colère", "soulagement"],
      context: "Livraison client",
    });
    expect(parsed.emotions).toEqual(["fierté", "colère", "soulagement"]);
  });

  it("rejects several words in one field", () => {
    const result = journalEntrySchema.safeParse({
      day: "2026-11-09",
      emotions: ["très content", "calme", "joie"],
      context: "",
    });
    expect(result.success).toBe(false);
  });

  it("ranks frequent emotions for the cloud", () => {
    const cloud = emotionFrequencies([
      { emotions: ["calme", "joie", "fatigue"] },
      { emotions: ["calme", "colère", "joie"] },
      { emotions: ["calme", "peur", "surprise"] },
    ]);
    expect(cloud[0]).toEqual({ word: "calme", count: 3, weight: 5 });
    expect(cloud[1]).toMatchObject({ word: "joie", count: 2 });
  });

  it("counts distinct journal days per month", () => {
    const byMonth = journalDaysByMonth(["2026-10-01", "2026-10-01", "2026-10-02", "2026-11-01"]);
    expect(byMonth.get("2026-10")).toBe(2);
    expect(byMonth.get("2026-11")).toBe(1);
  });
});

describe("quarterly review", () => {
  it("asks for the previous quarter when it was not reviewed", () => {
    expect(pendingReviewQuarter([], "2026-01-01", "2026-11-09")).toBe("2026-Q3");
  });

  it("asks for nothing when the program started after that quarter", () => {
    expect(pendingReviewQuarter([], "2026-10-15", "2026-11-09")).toBeNull();
  });

  it("opens the current quarter during its last two weeks", () => {
    expect(pendingReviewQuarter(["2026-Q3"], "2026-01-01", "2026-12-20")).toBe("2026-Q4");
  });

  it("builds ordered series per pillar", () => {
    const scores = { mental: 5, body: 6, maker: 3, strategy: 4, family: 7, presence: 2 };
    const series = scoreSeries([
      { quarter: "2026-Q4", scores: { ...scores, body: 8 } },
      { quarter: "2026-Q3", scores },
    ]);
    const body = series.find((item) => item.pillar === "body");
    expect(body?.points).toEqual([
      { quarter: "2026-Q3", score: 6 },
      { quarter: "2026-Q4", score: 8 },
    ]);
  });
});

describe("micro-entrepreneur thresholds", () => {
  it("defaults to the 2026 services thresholds", () => {
    expect(DEFAULT_MICRO_THRESHOLDS_2026).toMatchObject({
      vatFranchise: 37_500,
      vatFranchiseMajore: 41_250,
      microCeiling: 83_600,
    });
  });

  it("warns from 80 % and flags only amounts above the threshold", () => {
    const statuses = thresholdStatuses(37_500, DEFAULT_MICRO_THRESHOLDS_2026);
    expect(statuses.map((status) => status.level)).toEqual(["warning", "warning", "ok"]);
    expect(thresholdStatuses(37_501, DEFAULT_MICRO_THRESHOLDS_2026)[0].level).toBe("exceeded");
  });

  it("lets the user update thresholds when the law changes", () => {
    const updated = microThresholdsSchema.safeParse({
      ...DEFAULT_MICRO_THRESHOLDS_2026,
      year: "2027",
      vatFranchise: "40000",
      vatFranchiseMajore: "39000",
    });
    expect(updated.success).toBe(false);
  });

  it("computes months of savings", () => {
    expect(savingsMonths(9_000, 2_000)).toBe(4.5);
    expect(savingsMonths(1_000, 0)).toBeNull();
  });
});

describe("typical day", () => {
  it("finds the block in progress", () => {
    expect(DEFAULT_SCHEDULE[currentBlockIndex(DEFAULT_SCHEDULE, "09:15")].label).toBe("Travail profond");
    expect(currentBlockIndex(DEFAULT_SCHEDULE, "05:00")).toBe(-1);
  });

  it("rejects a block that ends before it starts", () => {
    expect(scheduleBlockSchema.safeParse({ start: "10:00", end: "09:00", label: "x" }).success).toBe(false);
  });
});
