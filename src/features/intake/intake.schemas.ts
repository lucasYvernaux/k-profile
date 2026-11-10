import { z } from "zod";
import { LIMITS, dateKey, id, optionalNumber, optionalText, timeHM } from "@/shared/lib/validation";

export const INTAKE_KINDS = ["water", "alcohol", "caffeine"] as const;

export const intakeQuerySchema = z.object({ date: dateKey.optional(), from: dateKey.optional(), to: dateKey.optional() });

/** Alcohol may be entered as on the label (volume cL + % vol) instead of an amount. */
export const createIntakeSchema = z
  .object({
    kind: z.enum(INTAKE_KINDS),
    amount: optionalNumber(-100_000, 100_000),
    label: optionalText(LIMITS.name),
    volumeCl: optionalNumber(0, 1_000),
    abv: optionalNumber(0, 100),
    date: dateKey.optional(),
    hour: z.coerce.number().int().min(0).max(23).optional(),
    minute: z.coerce.number().int().min(0).max(59).optional(),
  })
  .refine((v) => (v.kind === "alcohol" && v.volumeCl && v.abv) || (v.amount != null && v.amount !== 0), {
    message: "kind et amount (ou volumeCl + abv) requis",
    path: ["amount"],
  });

export const intakeIdQuerySchema = z.object({ id });

const preset = z.object({
  label: z.string().trim().min(1).max(60),
  amount: z.coerce.number().min(0).max(10_000),
  icon: z.string().regex(/^[a-z0-9-]{1,40}$/),
});

/** Partial config update; the server merges it with the stored config. */
export const intakeConfigSchema = z
  .object({
    waterGoal: z.coerce.number().int().min(0).max(20_000),
    waterStart: timeHM,
    waterEnd: timeHM,
    waterReminderMin: z.coerce.number().int().min(5).max(1_440),
    caffeineLimit: z.coerce.number().int().min(0).max(5_000),
    caffeineCutoff: timeHM,
    alcoholDailyLimit: z.coerce.number().min(0).max(100),
    alcoholWeeklyLimit: z.coerce.number().min(0).max(500),
    bodyWeightKg: z.coerce.number().min(20).max(400),
    bodySex: z.enum(["homme", "femme"]),
    legalLimit: z.coerce.number().min(0).max(5),
    presets: z.object({
      water: z.array(preset).max(30),
      alcohol: z.array(preset).max(30),
      caffeine: z.array(preset).max(30),
    }).partial(),
  })
  .partial();

export type CreateIntakeInput = z.infer<typeof createIntakeSchema>;
export type IntakeConfigPatch = z.infer<typeof intakeConfigSchema>;
