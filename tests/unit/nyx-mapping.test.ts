import { describe, expect, it } from "vitest";
import { camelize, lastByKey, mapHabitCadence, mapPillar, mapPillarScores } from "../../scripts/nyx/mapping";

describe("NYX-KAIROS → K migration mapping (ADR 0010)", () => {
  it("maps NYX pillars onto K pillars", () => {
    expect(mapPillar("forge")).toBe("body");
    expect(mapPillar("academie")).toBe("maker");
    expect(mapPillar("artisanat")).toBe("maker");
    expect(mapPillar("conseil")).toBe("family");
    expect(mapPillar("economie")).toBe("strategy");
    expect(mapPillar("gouvernement")).toBe("mental");
    expect(mapPillar("presence")).toBe("presence");
    expect(mapPillar("inconnu")).toBeNull();
    expect(mapPillar(null)).toBeNull();
  });

  it("averages monthly scores of two NYX pillars merged into one", () => {
    expect(JSON.parse(mapPillarScores('{"academie":6,"artisanat":9,"forge":7}') ?? "null")).toEqual({
      maker: 7.5,
      body: 7,
    });
    expect(mapPillarScores("not json")).toBeNull();
    expect(mapPillarScores(null)).toBeNull();
  });

  it("maps habit frequencies onto K cadences", () => {
    expect(mapHabitCadence("daily", null)).toEqual({ cadence: "daily", timesPerWeek: null });
    expect(mapHabitCadence("xweek", 3)).toEqual({ cadence: "weekly", timesPerWeek: 3 });
    expect(mapHabitCadence("xweek", 12)).toEqual({ cadence: "weekly", timesPerWeek: 7 });
    expect(mapHabitCadence("weekly", null)).toEqual({ cadence: "weekly", timesPerWeek: 1 });
    expect(mapHabitCadence("monthly", null)).toEqual({ cadence: "weekly", timesPerWeek: 1 });
  });

  it("keeps the latest row when NYX had duplicates", () => {
    const rows = [
      { id: 2, date: "2026-11-01", status: "missed" },
      { id: 5, date: "2026-11-01", status: "completed" },
      { id: 3, date: "2026-11-02", status: "completed" },
    ];
    expect(lastByKey(rows, (r) => r.date).map((r) => r.id)).toEqual([5, 3]);
  });

  it("camelizes snake_case columns", () => {
    expect(camelize({ week_start: "2026-11-02", body_fat_pct: 18 })).toEqual({ weekStart: "2026-11-02", bodyFatPct: 18 });
  });
});
