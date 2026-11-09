import { z } from "zod";
import { LIMITS, dateKey, idQuery, jsonArrayText, optionalInt, optionalText, requiredText } from "@/shared/lib/validation";

const score = optionalInt(1, 10);
const tagList = jsonArrayText(z.string().max(200), 50).optional();

export const journalQuerySchema = z.object({ date: dateKey.optional() });

export const saveJournalSchema = z.object({
  date: dateKey.optional(),
  mood: score,
  energy: score,
  focus: score,
  wins: optionalText(LIMITS.text),
  losses: optionalText(LIMITS.text),
  distractions: optionalText(LIMITS.text),
  emotionsNote: optionalText(LIMITS.text),
  improvements: optionalText(LIMITS.text),
  violatedRules: tagList,
  trapsHit: tagList,
  notes: optionalText(LIMITS.longText),
});

export const createEmotionSchema = z.object({
  emotion: requiredText(60),
  intensity: z.coerce.number().int().min(1).max(10).optional(),
  triggerText: optionalText(LIMITS.text),
  reaction: optionalText(LIMITS.text),
  idealReaction: optionalText(LIMITS.text),
  date: dateKey.optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
});

export const emotionIdQuerySchema = idQuery;

export type SaveJournalInput = z.infer<typeof saveJournalSchema>;
export type CreateEmotionInput = z.infer<typeof createEmotionSchema>;
