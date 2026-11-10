import { z } from "zod";
import { LIMITS, dateKey, optionalDate, optionalText, requiredText } from "@/shared/lib/validation";

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);
const frequencyDays = z.coerce.number().int().min(1).max(3650);

export const createTimerSchema = z.object({
  name: requiredText(),
  description: optionalText(LIMITS.text),
  icon: slug.optional(),
  category: slug.optional(),
  frequencyDays: frequencyDays.optional(),
  lastDone: optionalDate,
});

export const updateTimerSchema = z
  .object({
    name: requiredText(),
    description: optionalText(LIMITS.text),
    icon: slug,
    category: slug,
    frequencyDays,
    isActive: z.boolean(),
    lastDone: optionalDate,
    nextDue: optionalDate,
  })
  .partial();

export const completeTimerSchema = z.object({ date: dateKey.optional(), notes: optionalText(2_000) });

export type CreateTimerInput = z.infer<typeof createTimerSchema>;
export type UpdateTimerInput = z.infer<typeof updateTimerSchema>;
export type CompleteTimerInput = z.infer<typeof completeTimerSchema>;
