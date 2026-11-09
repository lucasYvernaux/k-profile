import { addDays, daysBetween, maxDayKey, type DayKey } from "./dates";
import type { PillarId } from "./pillars";

/**
 * Habit rules (product brief, section 4):
 * - at most 2 habits in formation at the same time;
 * - a habit is "stable" at >= 80 % completion over 6 weeks
 *   (a design choice, not a scientific figure);
 * - missing one day breaks nothing: no streak, only "never miss twice".
 */
export const MAX_FORMING_HABITS = 2;
export const STABILITY_WINDOW_DAYS = 42;
export const STABILITY_THRESHOLD = 0.8;

export type HabitCadence =
  | { kind: "daily" }
  | { kind: "weekly"; timesPerWeek: number };

/**
 * locked:  waiting in the queue
 * forming: active, being built (counts towards the limit of 2)
 * stable:  reached the stability threshold, still tracked
 * paused:  set aside by the user, frees a slot
 */
export type HabitStatus = "locked" | "forming" | "stable" | "paused";

export interface Habit {
  id: string;
  title: string;
  pillar: PillarId;
  cadence: HabitCadence;
  status: HabitStatus;
  queueOrder: number;
  activatedOn: DayKey | null;
}

/** A completed check-in. Absence of a check-in means "not done". */
export interface CheckIn {
  habitId: string;
  day: DayKey;
}

export function doneDaysFor(habitId: string, checkIns: readonly CheckIn[]): Set<DayKey> {
  return new Set(
    checkIns.filter((checkIn) => checkIn.habitId === habitId).map((checkIn) => checkIn.day),
  );
}

/**
 * Completion rate over the `windowDays` days ending on `endDay` (inclusive),
 * never counting days before the habit was activated.
 *
 * - daily habits: done days / tracked days;
 * - weekly habits: average over complete 7-day blocks (counted backwards from
 *   `endDay`) of min(done, target) / target. Extra sessions in one block do
 *   not compensate for a missed block, to reward regularity.
 *
 * Returns null when there is nothing to measure yet.
 */
export function completionRate(
  habit: Habit,
  checkIns: readonly CheckIn[],
  endDay: DayKey,
  windowDays = STABILITY_WINDOW_DAYS,
): number | null {
  if (!habit.activatedOn || endDay < habit.activatedOn) {
    return null;
  }
  const windowStart = maxDayKey(addDays(endDay, -(windowDays - 1)), habit.activatedOn);
  const done = doneDaysFor(habit.id, checkIns);

  if (habit.cadence.kind === "daily") {
    const trackedDays = daysBetween(windowStart, endDay) + 1;
    let doneCount = 0;
    for (let offset = 0; offset < trackedDays; offset += 1) {
      if (done.has(addDays(windowStart, offset))) {
        doneCount += 1;
      }
    }
    return doneCount / trackedDays;
  }

  const target = habit.cadence.timesPerWeek;
  const blockCount = Math.floor((daysBetween(windowStart, endDay) + 1) / 7);
  if (blockCount === 0) {
    return null;
  }
  let total = 0;
  for (let block = 0; block < blockCount; block += 1) {
    const blockEnd = addDays(endDay, -7 * block);
    let blockDone = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      if (done.has(addDays(blockEnd, -offset))) {
        blockDone += 1;
      }
    }
    total += Math.min(blockDone, target) / target;
  }
  return total / blockCount;
}

/**
 * A forming habit becomes stable once it has been active for the whole
 * window and its completion rate over that window reaches the threshold.
 * The window ends yesterday: today is not over yet.
 */
export function isStable(habit: Habit, checkIns: readonly CheckIn[], today: DayKey): boolean {
  if (habit.status !== "forming" || !habit.activatedOn) {
    return false;
  }
  const yesterday = addDays(today, -1);
  const activeDays = daysBetween(habit.activatedOn, yesterday) + 1;
  if (activeDays < STABILITY_WINDOW_DAYS) {
    return false;
  }
  const rate = completionRate(habit, checkIns, yesterday, STABILITY_WINDOW_DAYS);
  return rate !== null && rate >= STABILITY_THRESHOLD;
}

export interface ProgressionPlan {
  /** Forming habits that reached the stability threshold. */
  toStabilize: string[];
  /** Locked habits that can be unlocked now (user confirms in the UI). */
  unlockable: string[];
}

/** Computes which habits become stable and which can be unlocked. */
export function planProgression(
  habits: readonly Habit[],
  checkIns: readonly CheckIn[],
  today: DayKey,
): ProgressionPlan {
  const toStabilize = habits
    .filter((habit) => isStable(habit, checkIns, today))
    .map((habit) => habit.id);

  const formingAfter = habits.filter(
    (habit) => habit.status === "forming" && !toStabilize.includes(habit.id),
  ).length;
  const freeSlots = Math.max(0, MAX_FORMING_HABITS - formingAfter);

  const unlockable = habits
    .filter((habit) => habit.status === "locked")
    .sort((a, b) => a.queueOrder - b.queueOrder)
    .slice(0, freeSlots)
    .map((habit) => habit.id);

  return { toStabilize, unlockable };
}

export class HabitLimitError extends Error {
  constructor() {
    super(`Maximum ${MAX_FORMING_HABITS} habitudes en construction à la fois.`);
    this.name = "HabitLimitError";
  }
}

/** Guards a manual activation: never more than 2 forming habits. */
export function assertCanActivate(habits: readonly Habit[], habitId: string): void {
  const target = habits.find((habit) => habit.id === habitId);
  if (!target) {
    throw new RangeError("Habitude introuvable.");
  }
  if (target.status === "forming") {
    return;
  }
  const forming = habits.filter((habit) => habit.status === "forming").length;
  if (forming >= MAX_FORMING_HABITS) {
    throw new HabitLimitError();
  }
}

/** Is the habit expected on `day`? Weekly habits can be done any day. */
export function isTrackedOn(habit: Habit, day: DayKey): boolean {
  const active = habit.status === "forming" || habit.status === "stable";
  return active && habit.activatedOn !== null && day >= habit.activatedOn;
}

/** Count of done check-ins in the 7 days ending on `day` (weekly progress). */
export function doneInLastSevenDays(
  habitId: string,
  checkIns: readonly CheckIn[],
  day: DayKey,
): number {
  const done = doneDaysFor(habitId, checkIns);
  let count = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    if (done.has(addDays(day, -offset))) {
      count += 1;
    }
  }
  return count;
}

/**
 * Number of consecutive missed days ending yesterday, for a daily habit.
 * Used for the gentle "never miss twice" nudge, never for a punitive streak.
 */
export function consecutiveMissedDays(
  habit: Habit,
  checkIns: readonly CheckIn[],
  today: DayKey,
): number {
  if (habit.cadence.kind !== "daily" || !habit.activatedOn) {
    return 0;
  }
  const done = doneDaysFor(habit.id, checkIns);
  let missed = 0;
  let day = addDays(today, -1);
  while (day >= habit.activatedOn && !done.has(day)) {
    missed += 1;
    day = addDays(day, -1);
  }
  return missed;
}

export type MissNudge = "none" | "never-miss-twice" | "gentle-restart";

/**
 * - yesterday missed once  -> remind "ne rate pas deux jours d'affilée";
 * - 2 or more missed days  -> gentle restart message, no guilt.
 */
export function missNudge(habit: Habit, checkIns: readonly CheckIn[], today: DayKey): MissNudge {
  const missed = consecutiveMissedDays(habit, checkIns, today);
  if (missed === 0) {
    return "none";
  }
  return missed === 1 ? "never-miss-twice" : "gentle-restart";
}
