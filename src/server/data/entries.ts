import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { DayKey } from "@/domain/dates";
import type { JournalEntry, JournalEntryInput } from "@/domain/emotions";
import type { DailyLog } from "@/domain/vigilance";
import { userCipher } from "../crypto/user-data";
import { getDb } from "../db/client";
import { dailyEntry, journalEntry } from "../db/schema";

/* Daily priorities and health log ------------------------------------- */

export interface DailyRecord {
  priorities: string[];
  health: Omit<DailyLog, "day">;
}

const EMPTY_HEALTH: DailyRecord["health"] = { sleepHours: null, drinks: null };

export async function getDailyRecord(userId: string, day: DayKey): Promise<DailyRecord> {
  const row = await getDb().query.dailyEntry.findFirst({
    where: and(eq(dailyEntry.userId, userId), eq(dailyEntry.day, day)),
  });
  if (!row) {
    return { priorities: [], health: EMPTY_HEALTH };
  }
  const cipher = await userCipher(userId);
  return {
    priorities: row.prioritiesEnc ? cipher.open<string[]>("daily_entry.priorities", row.prioritiesEnc) : [],
    health: row.healthEnc ? cipher.open("daily_entry.health", row.healthEnc) : EMPTY_HEALTH,
  };
}

export async function savePriorities(userId: string, day: DayKey, priorities: string[]): Promise<void> {
  const cipher = await userCipher(userId);
  const prioritiesEnc = cipher.seal("daily_entry.priorities", priorities);
  await getDb()
    .insert(dailyEntry)
    .values({ userId, day, prioritiesEnc })
    .onConflictDoUpdate({ target: [dailyEntry.userId, dailyEntry.day], set: { prioritiesEnc } });
}

export async function saveHealth(userId: string, log: DailyLog): Promise<void> {
  const cipher = await userCipher(userId);
  const healthEnc = cipher.seal("daily_entry.health", {
    sleepHours: log.sleepHours,
    drinks: log.drinks,
  });
  await getDb()
    .insert(dailyEntry)
    .values({ userId, day: log.day, healthEnc })
    .onConflictDoUpdate({ target: [dailyEntry.userId, dailyEntry.day], set: { healthEnc } });
}

export async function listHealthLogs(userId: string, from: DayKey, to: DayKey): Promise<DailyLog[]> {
  const rows = await getDb().query.dailyEntry.findMany({
    where: and(eq(dailyEntry.userId, userId), gte(dailyEntry.day, from), lte(dailyEntry.day, to)),
    orderBy: [asc(dailyEntry.day)],
  });
  const cipher = await userCipher(userId);
  return rows
    .filter((row) => row.healthEnc)
    .map((row) => ({
      day: row.day,
      ...cipher.open<DailyRecord["health"]>("daily_entry.health", row.healthEnc as string),
    }));
}

/* Emotion journal ----------------------------------------------------- */

type JournalPayload = Pick<JournalEntryInput, "emotions" | "context">;

/** Idempotent on clientId, so offline replays never create duplicates. */
export async function addJournalEntry(
  userId: string,
  input: JournalEntryInput,
  clientId: string,
): Promise<void> {
  const cipher = await userCipher(userId);
  const payload: JournalPayload = { emotions: input.emotions, context: input.context };
  await getDb()
    .insert(journalEntry)
    .values({
      userId,
      day: input.day,
      clientId,
      payloadEnc: cipher.seal("journal_entry.payload", payload),
    })
    .onConflictDoNothing();
}

export async function listJournalEntries(userId: string, limit?: number): Promise<JournalEntry[]> {
  const rows = await getDb().query.journalEntry.findMany({
    where: eq(journalEntry.userId, userId),
    orderBy: [desc(journalEntry.day), desc(journalEntry.createdAt)],
    limit,
  });
  const cipher = await userCipher(userId);
  return rows.map((row) => ({
    id: row.id,
    day: row.day,
    createdAt: row.createdAt.toISOString(),
    ...cipher.open<JournalPayload>("journal_entry.payload", row.payloadEnc),
  }));
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  await getDb()
    .delete(journalEntry)
    .where(and(eq(journalEntry.id, entryId), eq(journalEntry.userId, userId)));
}
