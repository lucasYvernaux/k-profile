import { z } from "zod";
import {
  daysBetween,
  previousQuarter,
  quarterBounds,
  quarterKey,
  type DayKey,
  type QuarterKey,
} from "./dates";
import { PILLAR_IDS, type PillarId } from "./pillars";

/** Quarterly review: a 1-10 self-rating per pillar plus guided notes. */
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

const QUARTER_PATTERN = /^\d{4}-Q[1-4]$/;

export const quarterlyReviewSchema = z.object({
  quarter: z.string().regex(QUARTER_PATTERN, { message: "Trimestre invalide." }),
  scores: z.object(
    Object.fromEntries(
      PILLAR_IDS.map((pillar) => [pillar, z.coerce.number().int().min(MIN_SCORE).max(MAX_SCORE)]),
    ) as Record<PillarId, z.ZodCoercedNumber>,
  ),
  wins: z.string().trim().max(2000),
  obstacles: z.string().trim().max(2000),
  nextFocus: z.string().trim().max(2000),
});

export type QuarterlyReviewInput = z.infer<typeof quarterlyReviewSchema>;

/** Guided questions shown during the review. */
export const REVIEW_PROMPTS = {
  wins: "Qu'est-ce qui a fonctionné ce trimestre ? Quelles actions as-tu réellement faites ?",
  obstacles: "Qu'est-ce qui a freiné ? Qu'est-ce qui était trop ambitieux ?",
  nextFocus: "Sur quoi te concentrer au prochain trimestre (2 habitudes maximum) ?",
} as const;

/**
 * The review to do now, if any: the last completed quarter, provided the
 * program had started before it ended and it has not been reviewed yet.
 * During the last 14 days of a quarter, the current one can be reviewed.
 */
export function pendingReviewQuarter(
  reviewedQuarters: readonly string[],
  programStart: DayKey,
  today: DayKey,
): QuarterKey | null {
  const current = quarterKey(today);
  const reviewed = new Set(reviewedQuarters);
  const { end: currentEnd } = quarterBounds(current);
  const daysLeft = daysBetween(today, currentEnd);
  if (daysLeft < 14 && !reviewed.has(current)) {
    return current;
  }
  const previous = previousQuarter(current);
  const { end: previousEnd } = quarterBounds(previous);
  if (programStart <= previousEnd && !reviewed.has(previous)) {
    return previous;
  }
  return null;
}

export interface ScoreSeries {
  pillar: PillarId;
  points: { quarter: string; score: number }[];
}

/** One series per pillar, ordered by quarter, for the evolution chart. */
export function scoreSeries(
  reviews: readonly Pick<QuarterlyReviewInput, "quarter" | "scores">[],
): ScoreSeries[] {
  const ordered = [...reviews].sort((a, b) => a.quarter.localeCompare(b.quarter));
  return PILLAR_IDS.map((pillar) => ({
    pillar,
    points: ordered.map((review) => ({ quarter: review.quarter, score: review.scores[pillar] })),
  }));
}
