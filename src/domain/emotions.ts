import { z } from "zod";
import { isDayKey, monthKey, type DayKey } from "./dates";

/**
 * Evening journal: name 3 emotions in one word each, plus why.
 * Rationale: putting feelings into words (affect labeling) was associated
 * with reduced amygdala response (Lieberman et al., 2007).
 */
export const EMOTIONS_PER_ENTRY = 3;
export const MAX_CONTEXT_LENGTH = 2000;

const EMOTION_WORD = /^\p{L}[\p{L}'’-]{0,39}$/u;

export function normalizeEmotion(raw: string): string {
  return raw.normalize("NFC").trim().toLocaleLowerCase("fr-FR");
}

export const emotionWordSchema = z
  .string()
  .transform(normalizeEmotion)
  .refine((word) => EMOTION_WORD.test(word), {
    message: "Un seul mot, sans espace ni chiffre (40 caractères max).",
  });

export const journalEntrySchema = z.object({
  day: z.string().refine(isDayKey, { message: "Date invalide." }),
  emotions: z.array(emotionWordSchema).length(EMOTIONS_PER_ENTRY),
  context: z
    .string()
    .trim()
    .max(MAX_CONTEXT_LENGTH, { message: `${MAX_CONTEXT_LENGTH} caractères maximum.` }),
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

export interface JournalEntry extends JournalEntryInput {
  id: string;
  createdAt: string;
}

/** Suggestions only; the user can type any word. */
export const EMOTION_SUGGESTIONS = [
  "joie", "fierté", "gratitude", "calme", "soulagement", "enthousiasme",
  "confiance", "curiosité", "tristesse", "colère", "frustration", "irritation",
  "peur", "anxiété", "inquiétude", "honte", "culpabilité", "jalousie",
  "ennui", "solitude", "déception", "surprise", "dégoût", "lassitude",
] as const;

export interface EmotionFrequency {
  word: string;
  count: number;
  /** 1 (rare) to 5 (most frequent), used for the cloud's font size. */
  weight: 1 | 2 | 3 | 4 | 5;
}

/** Most frequent emotions, most frequent first, ties sorted alphabetically. */
export function emotionFrequencies(
  entries: readonly Pick<JournalEntryInput, "emotions">[],
  limit = 30,
): EmotionFrequency[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const emotion of entry.emotions) {
      counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()]
    .sort(([wordA, countA], [wordB, countB]) => countB - countA || wordA.localeCompare(wordB, "fr"))
    .slice(0, limit);
  const maxCount = sorted[0]?.[1] ?? 1;
  return sorted.map(([word, count]) => ({
    word,
    count,
    weight: (Math.ceil((count / maxCount) * 5) || 1) as EmotionFrequency["weight"],
  }));
}

/** Number of distinct journal days per month (indicator "jours de journal par mois"). */
export function journalDaysByMonth(days: readonly DayKey[]): Map<string, number> {
  const distinct = new Set(days);
  const byMonth = new Map<string, number>();
  for (const day of distinct) {
    const month = monthKey(day);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }
  return byMonth;
}
