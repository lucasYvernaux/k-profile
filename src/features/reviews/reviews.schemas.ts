import { z } from "zod";
import { LIMITS, dateKey, jsonArrayText, monthKey, optionalInt, optionalText } from "@/shared/lib/validation";

const text = optionalText(LIMITS.text);
const flag = z.boolean().nullable().optional();
const tagList = jsonArrayText(z.string().max(200), 50).optional();

export const reviewsQuerySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("weekly"), key: dateKey.optional() }),
  z.object({ type: z.literal("monthly"), key: monthKey.optional() }),
]);

/** Accepts the legacy request without `type` as a weekly query. */
export const reviewsQueryInput = z.preprocess(
  (v) => (v && typeof v === "object" && !("type" in v) ? { ...v, type: "weekly" } : v),
  reviewsQuerySchema
);

const pillarScores = z
  .union([z.record(z.string().max(30), z.coerce.number().min(0).max(10)), z.string().max(2_000), z.null()])
  .transform((value, ctx) => {
    if (value === null || value === "") return null;
    if (typeof value !== "string") return JSON.stringify(value);
    try {
      const parsed = z.record(z.string().max(30), z.number().min(0).max(10)).parse(JSON.parse(value));
      return JSON.stringify(parsed);
    } catch {
      ctx.addIssue({ code: "custom", message: "Scores invalides" });
      return z.NEVER;
    }
  })
  .optional();

export const weeklyReviewSchema = z.object({
  type: z.literal("weekly"),
  weekStart: dateKey,
  mondayPlanned: flag,
  fridayCreated: text,
  fridayDone: flag,
  saturdayCircle: flag,
  sundayReview: flag,
  biggestWin: text,
  biggestFail: text,
  learned: text,
  violatedRules: tagList,
  trapsHit: tagList,
  nextWeekGoal: text,
  focusPillar: optionalText(30),
  overallMood: optionalInt(1, 10),
  notes: optionalText(LIMITS.longText),
});

export const monthlyAuditSchema = z.object({
  type: z.literal("monthly"),
  month: monthKey,
  challenge: text,
  skillDeveloped: text,
  circleNurtured: text,
  financialProgress: text,
  limitsDestroyed: text,
  deathAndRebirth: text,
  pillarScores,
  nextMonthGoals: text,
});

export const saveReviewSchema = z.discriminatedUnion("type", [weeklyReviewSchema, monthlyAuditSchema]);

export type WeeklyReviewInput = z.infer<typeof weeklyReviewSchema>;
export type MonthlyAuditInput = z.infer<typeof monthlyAuditSchema>;
export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;
