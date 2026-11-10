import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { emotionLogs, logbookEntries } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { evaluateAchievements } from "@/features/progress/server/progress.service";
import { serverTodayKey, zonedNow } from "@/server/time";
import { definedOnly } from "@/shared/lib/validation";
import type { CreateEmotionInput, SaveJournalInput } from "../journal.schemas";

/*
 * Logbook ("Bilan du jour"): daily self-assessment and detailed emotion logs.
 * It complements the K emotion journal (3 words + context), it does not
 * replace it (ADR 0010).
 */

const RECENT_JOURNALS = 120;
const RECENT_EMOTIONS = 400;

const myLogbook = () => eq(logbookEntries.userId, currentUserId());

export async function getJournal(date: string) {
  return (
    (await getDb().select().from(logbookEntries).where(and(myLogbook(), eq(logbookEntries.date, date))).limit(1))[0] ??
    null
  );
}

export function listJournals() {
  return getDb()
    .select()
    .from(logbookEntries)
    .where(myLogbook())
    .orderBy(desc(logbookEntries.date))
    .limit(RECENT_JOURNALS);
}

/** One logbook entry per day: creates it or updates the provided fields. */
export async function saveJournal(input: SaveJournalInput) {
  const { date = serverTodayKey(), ...fields } = input;
  const values = definedOnly(fields);
  await getDb()
    .insert(logbookEntries)
    .values({ ...values, userId: currentUserId(), date })
    .onConflictDoUpdate({
      target: [logbookEntries.userId, logbookEntries.date],
      set: Object.keys(values).length ? values : { date },
    });
  await evaluateAchievements();
}

export function listEmotions() {
  return getDb()
    .select()
    .from(emotionLogs)
    .where(eq(emotionLogs.userId, currentUserId()))
    .orderBy(desc(emotionLogs.id))
    .limit(RECENT_EMOTIONS);
}

export async function createEmotion(input: CreateEmotionInput) {
  const [row] = await getDb()
    .insert(emotionLogs)
    .values({
      userId: currentUserId(),
      emotion: input.emotion,
      intensity: input.intensity ?? 5,
      triggerText: input.triggerText ?? null,
      reaction: input.reaction ?? null,
      idealReaction: input.idealReaction ?? null,
      date: input.date ?? serverTodayKey(),
      hour: input.hour ?? zonedNow().hour,
    })
    .returning();
  return row;
}

export async function deleteEmotion(emotionId: number) {
  await getDb()
    .delete(emotionLogs)
    .where(and(eq(emotionLogs.userId, currentUserId()), eq(emotionLogs.id, emotionId)));
}
