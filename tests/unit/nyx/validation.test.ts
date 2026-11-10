import { describe, expect, it } from "vitest";
import { z } from "zod";
import { dateKey, daysOfWeekJson, definedOnly, jsonArrayText, optionalText } from "@/shared/lib/validation";
import { updateTimerSchema } from "@/features/timers/timers.schemas";
import { recordPhaseSchema } from "@/features/routine/routine.schemas";

describe("dateKey", () => {
  it("accepts real dates only", () => {
    expect(dateKey.safeParse("2026-02-28").success).toBe(true);
    expect(dateKey.safeParse("2026-02-30").success).toBe(false);
    expect(dateKey.safeParse("26-2-1").success).toBe(false);
  });
});

describe("optionalText", () => {
  const schema = z.object({ note: optionalText(10) });

  it("maps empty strings to null", () => {
    expect(schema.parse({ note: "  " })).toEqual({ note: null });
  });

  it("keeps an absent key absent, so PATCH does not erase data", () => {
    expect(schema.parse({})).toEqual({});
  });

  it("enforces the maximum length", () => {
    expect(schema.safeParse({ note: "x".repeat(11) }).success).toBe(false);
  });
});

describe("daysOfWeekJson", () => {
  it("normalises arrays and JSON strings", () => {
    expect(daysOfWeekJson.parse([3, 1, 1])).toBe("[1,3]");
    expect(daysOfWeekJson.parse("[0]")).toBe("[0]");
    expect(daysOfWeekJson.parse([])).toBeNull();
  });

  it("rejects out-of-range days", () => {
    expect(daysOfWeekJson.safeParse([7]).success).toBe(false);
  });
});

describe("jsonArrayText", () => {
  const tags = jsonArrayText(z.string().max(20));

  it("stores arrays as JSON text", () => {
    expect(tags.parse(["a", "b"])).toBe('["a","b"]');
  });

  it("unwraps legacy double-encoded values", () => {
    expect(tags.parse(JSON.stringify(JSON.stringify(["a"])))).toBe('["a"]');
  });

  it("rejects invalid items", () => {
    expect(tags.safeParse([1]).success).toBe(false);
  });
});

describe("feature schemas", () => {
  it("strips unknown keys (no mass assignment)", () => {
    const parsed = updateTimerSchema.parse({ name: "Draps", id: 99, userId: "someone-else", createdAt: "x" });
    expect(parsed).toEqual({ name: "Draps" });
  });

  it("requires a valid phase status unless clearing", () => {
    expect(recordPhaseSchema.safeParse({ phaseKey: "matin", status: "x" }).success).toBe(false);
    expect(recordPhaseSchema.safeParse({ phaseKey: "matin", status: "x", clear: true }).success).toBe(true);
    expect(recordPhaseSchema.safeParse({ phaseKey: "matin", status: "completed" }).success).toBe(true);
  });

  it("definedOnly drops undefined values", () => {
    expect(definedOnly({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});
