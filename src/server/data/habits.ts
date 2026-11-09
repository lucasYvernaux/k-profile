import "server-only";
import { and, asc, eq, gte, inArray, max } from "drizzle-orm";
import { addDays, type DayKey } from "@/domain/dates";
import {
  assertCanActivate,
  planProgression,
  STABILITY_WINDOW_DAYS,
  type CheckIn,
  type Habit,
  type HabitStatus,
} from "@/domain/habits";
import type { PillarId } from "@/domain/pillars";
import { getDb } from "../db/client";
import { habit, habitCheckIn } from "../db/schema";

type HabitRow = typeof habit.$inferSelect;

function toDomain(row: HabitRow): Habit {
  return {
    id: row.id,
    title: row.title,
    pillar: row.pillar,
    status: row.status,
    queueOrder: row.queueOrder,
    activatedOn: row.activatedOn,
    cadence:
      row.cadence === "weekly"
        ? { kind: "weekly", timesPerWeek: row.timesPerWeek ?? 1 }
        : { kind: "daily" },
  };
}

export async function listHabits(userId: string): Promise<Habit[]> {
  const rows = await getDb().query.habit.findMany({
    where: eq(habit.userId, userId),
    orderBy: [asc(habit.queueOrder)],
  });
  return rows.map(toDomain);
}

/** Check-ins since `from` (default: enough history for the stability window). */
export async function listCheckIns(userId: string, from: DayKey): Promise<CheckIn[]> {
  return getDb()
    .select({ habitId: habitCheckIn.habitId, day: habitCheckIn.day })
    .from(habitCheckIn)
    .where(and(eq(habitCheckIn.userId, userId), gte(habitCheckIn.day, from)));
}

export async function loadHabitState(userId: string, today: DayKey) {
  const [habits, checkIns] = await Promise.all([
    listHabits(userId),
    listCheckIns(userId, addDays(today, -(STABILITY_WINDOW_DAYS + 7))),
  ]);
  return { habits, checkIns };
}

/** Marks habits that reached the threshold as stable. Returns the unlockable ones. */
export async function applyProgression(userId: string, today: DayKey) {
  const { habits, checkIns } = await loadHabitState(userId, today);
  const plan = planProgression(habits, checkIns, today);
  if (plan.toStabilize.length > 0) {
    await getDb()
      .update(habit)
      .set({ status: "stable", stabilizedOn: today })
      .where(and(eq(habit.userId, userId), inArray(habit.id, plan.toStabilize)));
  }
  return plan;
}

async function ownedHabit(userId: string, habitId: string): Promise<HabitRow> {
  const row = await getDb().query.habit.findFirst({
    where: and(eq(habit.id, habitId), eq(habit.userId, userId)),
  });
  if (!row) {
    throw new RangeError("Habitude introuvable.");
  }
  return row;
}

export async function setCheckIn(
  userId: string,
  habitId: string,
  day: DayKey,
  done: boolean,
): Promise<void> {
  await ownedHabit(userId, habitId);
  if (done) {
    await getDb().insert(habitCheckIn).values({ habitId, userId, day }).onConflictDoNothing();
    return;
  }
  await getDb()
    .delete(habitCheckIn)
    .where(
      and(eq(habitCheckIn.habitId, habitId), eq(habitCheckIn.userId, userId), eq(habitCheckIn.day, day)),
    );
}

/** Activates a habit, enforcing the "2 habits in formation" rule. */
export async function activateHabit(userId: string, habitId: string, today: DayKey): Promise<void> {
  const habits = await listHabits(userId);
  assertCanActivate(habits, habitId);
  const row = await ownedHabit(userId, habitId);
  if (row.status === "forming") {
    return;
  }
  // A (re)activation starts a fresh measurement window.
  await getDb()
    .update(habit)
    .set({ status: "forming", activatedOn: today, stabilizedOn: null })
    .where(and(eq(habit.id, habitId), eq(habit.userId, userId)));
}

export async function setHabitStatus(
  userId: string,
  habitId: string,
  status: Extract<HabitStatus, "paused" | "locked">,
): Promise<void> {
  await ownedHabit(userId, habitId);
  await getDb()
    .update(habit)
    .set({ status })
    .where(and(eq(habit.id, habitId), eq(habit.userId, userId)));
}

export interface NewHabit {
  title: string;
  pillar: PillarId;
  cadence: "daily" | "weekly";
  timesPerWeek: number | null;
}

export async function addHabit(userId: string, input: NewHabit): Promise<void> {
  const [{ last }] = await getDb()
    .select({ last: max(habit.queueOrder) })
    .from(habit)
    .where(eq(habit.userId, userId));
  await getDb().insert(habit).values({
    userId,
    title: input.title,
    pillar: input.pillar,
    cadence: input.cadence,
    timesPerWeek: input.cadence === "weekly" ? input.timesPerWeek : null,
    status: "locked",
    queueOrder: (last ?? 0) + 1,
  });
}

/** Swaps a locked habit with its neighbour in the queue. */
export async function moveHabit(userId: string, habitId: string, direction: -1 | 1): Promise<void> {
  const habits = await listHabits(userId);
  const index = habits.findIndex((item) => item.id === habitId);
  const neighbour = habits[index + direction];
  if (index === -1 || !neighbour) {
    return;
  }
  const current = habits[index];
  await getDb().transaction(async (tx) => {
    await tx
      .update(habit)
      .set({ queueOrder: neighbour.queueOrder })
      .where(and(eq(habit.id, current.id), eq(habit.userId, userId)));
    await tx
      .update(habit)
      .set({ queueOrder: current.queueOrder })
      .where(and(eq(habit.id, neighbour.id), eq(habit.userId, userId)));
  });
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  await getDb().delete(habit).where(and(eq(habit.id, habitId), eq(habit.userId, userId)));
}
