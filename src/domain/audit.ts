import { z } from "zod";

/**
 * Phase 0 audit (brief, section 5). Saved as the baseline.
 *
 * Big Five: the app does not embed a questionnaire. The user takes an IPIP
 * test elsewhere and enters the 5 scores as percentiles. Translating the
 * items ourselves would produce an unvalidated instrument (see ADR 0004).
 */
const optionalNumber = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const BIG_FIVE_TRAITS = {
  openness: "Ouverture",
  conscientiousness: "Conscienciosité",
  extraversion: "Extraversion",
  agreeableness: "Agréabilité",
  neuroticism: "Névrosisme (instabilité émotionnelle)",
} as const;

export type BigFiveTrait = keyof typeof BIG_FIVE_TRAITS;

export const bigFiveSchema = z.object({
  takenOn: z.iso.date(),
  instrument: z.string().trim().max(120),
  openness: optionalNumber(0, 100),
  conscientiousness: optionalNumber(0, 100),
  extraversion: optionalNumber(0, 100),
  agreeableness: optionalNumber(0, 100),
  neuroticism: optionalNumber(0, 100),
});

export type BigFiveResult = z.infer<typeof bigFiveSchema>;

export const auditSchema = z.object({
  bigFive: bigFiveSchema,
  body: z.object({
    weightKg: optionalNumber(20, 400),
    waistCm: optionalNumber(30, 250),
    restingHeartRate: optionalNumber(25, 220),
    pushUps: optionalNumber(0, 1000),
    wakeTime: z.string().max(5),
    bedTime: z.string().max(5),
  }),
  business: z.object({
    revenueLast12Months: optionalNumber(0, 10_000_000),
    dailyRate: optionalNumber(0, 100_000),
    biggestClientShare: optionalNumber(0, 100),
    workHoursPerWeek: optionalNumber(0, 168),
  }),
  money: z.object({
    savings: optionalNumber(0, 100_000_000),
    monthlyExpenses: optionalNumber(0, 1_000_000),
  }),
  relationships: z.object({
    /** First names or nicknames only (data minimisation). */
    closeCircle: z.array(z.string().trim().max(40)).max(10),
  }),
  habits: z.object({
    drinksPerWeek: optionalNumber(0, 200),
    screenHoursPerDay: optionalNumber(0, 24),
  }),
  notes: z.string().trim().max(4000),
});

export type Audit = z.infer<typeof auditSchema>;
