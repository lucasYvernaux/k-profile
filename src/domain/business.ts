import { z } from "zod";
import { SOURCES } from "./sources";

/**
 * Micro-entrepreneur thresholds for services. They change with the law, so
 * they are stored per user and editable; these are only the defaults.
 * This is information, not tax advice: the UI refers to an accountant.
 */
export const microThresholdsSchema = z
  .object({
    year: z.coerce.number().int().min(2020).max(2100),
    vatFranchise: z.coerce.number().positive(),
    vatFranchiseMajore: z.coerce.number().positive(),
    microCeiling: z.coerce.number().positive(),
    sourceUrl: z.url({ protocol: /^https$/ }),
  })
  .refine((value) => value.vatFranchise <= value.vatFranchiseMajore, {
    message: "Le seuil majoré doit être supérieur ou égal au seuil de base.",
    path: ["vatFranchiseMajore"],
  });

export type MicroThresholds = z.infer<typeof microThresholdsSchema>;

export const DEFAULT_MICRO_THRESHOLDS_2026: MicroThresholds = {
  year: 2026,
  vatFranchise: 37_500,
  vatFranchiseMajore: 41_250,
  microCeiling: 83_600,
  sourceUrl: SOURCES.microThresholds2026.url,
};

export const THRESHOLD_WARNING_RATIO = 0.8;

export type ThresholdId = "vatFranchise" | "vatFranchiseMajore" | "microCeiling";

export const THRESHOLD_LABELS: Record<ThresholdId, string> = {
  vatFranchise: "Franchise en base de TVA",
  vatFranchiseMajore: "Seuil majoré de franchise de TVA",
  microCeiling: "Plafond du régime micro",
};

export interface ThresholdStatus {
  id: ThresholdId;
  amount: number;
  ratio: number;
  level: "ok" | "warning" | "exceeded";
}

/** Position of the year-to-date revenue against each threshold. */
export function thresholdStatuses(
  revenueYearToDate: number,
  thresholds: MicroThresholds,
  warningRatio = THRESHOLD_WARNING_RATIO,
): ThresholdStatus[] {
  const ids: ThresholdId[] = ["vatFranchise", "vatFranchiseMajore", "microCeiling"];
  return ids.map((id) => {
    const amount = thresholds[id];
    const ratio = revenueYearToDate / amount;
    const level = ratio > 1 ? "exceeded" : ratio >= warningRatio ? "warning" : "ok";
    return { id, amount, ratio, level };
  });
}

/** Months of expenses covered by savings, rounded down to one decimal. */
export function savingsMonths(savings: number, monthlyExpenses: number): number | null {
  if (monthlyExpenses <= 0) {
    return null;
  }
  return Math.floor((savings / monthlyExpenses) * 10) / 10;
}

export const SAVINGS_TARGET_MONTHS = 6;
