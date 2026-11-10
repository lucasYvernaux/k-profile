import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { timerHistory, timers } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { evaluateAchievements } from "@/features/progress/server/progress.service";
import { addDays } from "@/shared/lib/dates";

/*
 * NYX-KAIROS also checked a "Contact avec le cercle intime" habit here. K
 * habits follow their own rules (2 in formation at most, no automatic
 * check-in), so only the upkeep timer is completed now (ADR 0010).
 */

/** Completes the "Contacter un membre du cercle" upkeep timer (once a day at most). */
export async function completeCircleTimer(date: string) {
  const userId = currentUserId();
  const all = await getDb()
    .select()
    .from(timers)
    .where(and(eq(timers.userId, userId), eq(timers.category, "cercle"), eq(timers.isActive, true)));
  const timer = all.find((t) => /contacter/i.test(t.name));
  if (!timer || (timer.lastDone && timer.lastDone >= date)) return false;
  await getDb().transaction(async (tx) => {
    await tx
      .insert(timerHistory)
      .values({ userId, timerId: timer.id, completedAt: date, notes: "Depuis le réseau" });
    await tx
      .update(timers)
      .set({ lastDone: date, nextDue: addDays(date, timer.frequencyDays) })
      .where(and(eq(timers.userId, userId), eq(timers.id, timer.id)));
  });
  await evaluateAchievements();
  return true;
}
