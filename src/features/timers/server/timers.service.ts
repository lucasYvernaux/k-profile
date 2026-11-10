import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { timerHistory, timers } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { notFound } from "@/server/http/errors";
import { evaluateAchievements } from "@/features/progress/server/progress.service";
import { ensureSeeded } from "@/features/progress/server/seed";
import { addDays, diffDays } from "@/shared/lib/dates";
import { serverTodayKey } from "@/server/time";
import { definedOnly } from "@/shared/lib/validation";
import type { CompleteTimerInput, CreateTimerInput, UpdateTimerInput } from "../timers.schemas";

const DEFAULT_FREQUENCY_DAYS = 7;
const HISTORY_LIMIT = 200;

export type TimerStatus = "late" | "soon" | "ok";

/** "soon" when less than 20% of the period remains. */
export function timerStatus(remainingDays: number, frequencyDays: number): TimerStatus {
  if (remainingDays < 0) return "late";
  return frequencyDays > 0 && remainingDays / frequencyDays <= 0.2 ? "soon" : "ok";
}

const ownTimer = (timerId: number) => and(eq(timers.userId, currentUserId()), eq(timers.id, timerId));

async function findTimer(timerId: number) {
  const row = (await getDb().select().from(timers).where(ownTimer(timerId)).limit(1))[0];
  if (!row) throw notFound("Tâche introuvable");
  return row;
}

export async function listTimers() {
  await ensureSeeded();
  const userId = currentUserId();
  const today = serverTodayKey();
  const [rows, history] = await Promise.all([
    getDb().select().from(timers).where(eq(timers.userId, userId)),
    getDb()
      .select()
      .from(timerHistory)
      .where(eq(timerHistory.userId, userId))
      .orderBy(desc(timerHistory.id))
      .limit(HISTORY_LIMIT),
  ]);
  const enriched = rows
    .map((t) => {
      const remaining = diffDays(t.nextDue ?? today, today);
      return { ...t, remaining, status: timerStatus(remaining, t.frequencyDays) };
    })
    .sort((a, b) => a.remaining - b.remaining);
  return { timers: enriched, history };
}

export async function createTimer(input: CreateTimerInput) {
  const lastDone = input.lastDone ?? serverTodayKey();
  const frequency = input.frequencyDays ?? DEFAULT_FREQUENCY_DAYS;
  const [row] = await getDb()
    .insert(timers)
    .values({
      userId: currentUserId(),
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? "timer",
      category: input.category ?? "maison",
      frequencyDays: frequency,
      lastDone,
      nextDue: addDays(lastDone, frequency),
    })
    .returning();
  return row;
}

/** Changing the frequency or the last completion recomputes the next due date. */
export async function updateTimer(timerId: number, patch: UpdateTimerInput) {
  const current = await findTimer(timerId);
  const values: Partial<typeof timers.$inferInsert> = definedOnly(patch);
  if (patch.frequencyDays !== undefined || patch.lastDone !== undefined) {
    const base = patch.lastDone ?? current.lastDone ?? serverTodayKey();
    values.nextDue = addDays(base, patch.frequencyDays ?? current.frequencyDays);
  }
  if (patch.nextDue !== undefined) values.nextDue = patch.nextDue;
  if (Object.keys(values).length) await getDb().update(timers).set(values).where(ownTimer(timerId));
}

/** History rows go with the timer (foreign key, cascade). */
export async function deleteTimer(timerId: number) {
  await getDb().delete(timers).where(ownTimer(timerId));
}

export async function completeTimer(timerId: number, input: CompleteTimerInput) {
  const done = input.date ?? serverTodayKey();
  const current = await findTimer(timerId);
  await getDb().transaction(async (tx) => {
    await tx
      .insert(timerHistory)
      .values({ userId: current.userId, timerId, completedAt: done, notes: input.notes ?? null });
    await tx
      .update(timers)
      .set({ lastDone: done, nextDue: addDays(done, current.frequencyDays) })
      .where(ownTimer(timerId));
  });
  await evaluateAchievements();
}
