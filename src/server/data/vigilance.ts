import "server-only";
import { addDays, type DayKey } from "@/domain/dates";
import type { CheckIn, Habit } from "@/domain/habits";
import { vigilanceSignals, type VigilanceSignal } from "@/domain/vigilance";
import { listHealthLogs } from "./entries";

/** Builds the vigilance signals from already loaded habits and check-ins. */
export async function loadVigilance(
  userId: string,
  today: DayKey,
  programStart: DayKey,
  habits: Habit[],
  checkIns: CheckIn[],
): Promise<VigilanceSignal[]> {
  const logs = await listHealthLogs(userId, addDays(today, -14), today);
  const familyHabitIds = new Set(habits.filter((habit) => habit.pillar === "family").map((habit) => habit.id));
  const lastFamilyActivity =
    checkIns
      .filter((checkIn) => familyHabitIds.has(checkIn.habitId))
      .map((checkIn) => checkIn.day)
      .sort()
      .at(-1) ?? null;
  return vigilanceSignals({ today, logs, habits, checkIns, lastFamilyActivity, programStart });
}
