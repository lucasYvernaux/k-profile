import { z } from "zod";
import { isDayKey } from "./dates";
import { journalEntrySchema } from "./emotions";
import { dailyPrioritiesSchema } from "./schedule";
import { dailyLogSchema } from "./vigilance";

/**
 * Daily inputs that work offline: they are queued on the device and
 * replayed in order to /api/sync. Every item is idempotent.
 */
const dayKey = z.string().refine(isDayKey, { message: "Date invalide." });

export const syncItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("check-in"), habitId: z.uuid(), day: dayKey, done: z.boolean() }),
  journalEntrySchema.extend({ kind: z.literal("journal"), clientId: z.uuid() }),
  dailyLogSchema.extend({ kind: z.literal("health") }),
  z.object({ kind: z.literal("priorities"), day: dayKey, priorities: dailyPrioritiesSchema }),
]);

export const MAX_SYNC_BATCH = 200;

export const syncRequestSchema = z.object({
  items: z.array(syncItemSchema).min(1).max(MAX_SYNC_BATCH),
});

export type SyncItem = z.input<typeof syncItemSchema>;
