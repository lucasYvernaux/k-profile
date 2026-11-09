import { z } from "zod";
import { dateKey, daysOfWeekJson, optionalText, requiredText, timeHM } from "@/shared/lib/validation";

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);

const phaseFields = {
  key: z.string().trim().max(40).optional(),
  title: requiredText(120),
  startTime: timeHM,
  endTime: timeHM,
  icon: slug.optional(),
  pillar: z.preprocess((v) => (v === "" ? null : v), slug.nullable()).optional(),
  daysOfWeek: daysOfWeekJson.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
};

export const createPhaseSchema = z.object(phaseFields);
export const updatePhaseSchema = z.object(phaseFields).omit({ key: true }).partial();

export const phaseEntriesQuerySchema = z.object({ date: dateKey.optional() });

export const PHASE_STATUSES = ["completed", "skipped", "missed"] as const;

export const recordPhaseSchema = z
  .object({
    date: dateKey.optional(),
    phaseKey: z.string().min(1).max(60),
    /** Ignored when `clear` is true (the dashboard sends a placeholder). */
    status: z.string().max(20),
    notes: optionalText(2_000),
    /** true removes the day's record for this phase */
    clear: z.boolean().optional(),
  })
  .refine((v) => v.clear || (PHASE_STATUSES as readonly string[]).includes(v.status), {
    path: ["status"],
    message: "Statut invalide",
  })
  .transform((v) => ({ ...v, status: v.status as (typeof PHASE_STATUSES)[number] }));

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;
export type RecordPhaseInput = z.infer<typeof recordPhaseSchema>;
