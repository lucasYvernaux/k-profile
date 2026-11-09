import "server-only";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  achievements,
  dailyScores,
  habit,
  habitCheckIn,
  logbookEntries,
  people,
  personInteractions,
  phaseDefs,
  phaseEntries,
  projects,
  timerHistory,
  workouts,
} from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { DEFAULT_ACHIEVEMENTS, PILLARS } from "@/shared/domain/constants";
import { addDays, appliesOn, diffDays, weekStartOf } from "@/shared/lib/dates";
import { serverTodayKey } from "@/server/time";
import { INNER_CIRCLE_MIN } from "@/features/network/domain/network";

/*
 * Optional gamification (ADR 0010). Scores and badges are always computed so
 * the history is complete when the user turns the feature on; the switch only
 * hides them. Only plain (unsealed) columns are read here, so these functions
 * also run from K screens without a data-key scope.
 *
 * Daily score: K habits in formation or stable (70 %) and routine phases
 * (30 %). A part with nothing due that day gives its weight to the other.
 */

const ACTIVE_STATUSES = ["forming", "stable"] as const;

type DayScore = { date: string; score: number };

function percent(done: number, total: number): number | null {
  return total > 0 ? Math.min(100, (done / total) * 100) : null;
}

export async function recomputeDay(date: string, userId: string = currentUserId()) {
  const db = getDb();
  const [activeHabits, checkIns, phases, checks] = await Promise.all([
    db
      .select({ id: habit.id, cadence: habit.cadence })
      .from(habit)
      .where(and(eq(habit.userId, userId), inArray(habit.status, [...ACTIVE_STATUSES]))),
    db
      .select({ habitId: habitCheckIn.habitId })
      .from(habitCheckIn)
      .where(and(eq(habitCheckIn.userId, userId), eq(habitCheckIn.day, date))),
    db
      .select({ daysOfWeek: phaseDefs.daysOfWeek })
      .from(phaseDefs)
      .where(and(eq(phaseDefs.userId, userId), eq(phaseDefs.isActive, true))),
    db
      .select({ status: phaseEntries.status })
      .from(phaseEntries)
      .where(and(eq(phaseEntries.userId, userId), eq(phaseEntries.date, date))),
  ]);

  const activeIds = new Set(activeHabits.map((h) => h.id));
  const checked = new Set(checkIns.map((c) => c.habitId).filter((id) => activeIds.has(id)));
  const weeklyChecked = activeHabits.filter((h) => h.cadence === "weekly" && checked.has(h.id)).length;
  const habitsTotal = activeHabits.filter((h) => h.cadence === "daily").length + weeklyChecked;
  const habitsDone = checked.size;

  const phasesTotal = phases.filter((p) => appliesOn(p.daysOfWeek, date)).length;
  const phasesDone = checks.filter((c) => c.status === "completed").length;

  const habitsPct = percent(habitsDone, habitsTotal);
  const phasesPct = percent(phasesDone, phasesTotal);
  const hasData = checkIns.length > 0 || checks.length > 0;
  let score = 0;
  if (hasData) {
    if (habitsPct !== null && phasesPct !== null) score = habitsPct * 0.7 + phasesPct * 0.3;
    else score = habitsPct ?? phasesPct ?? 0;
  }
  const rounded = Math.round(score);
  const values = {
    score: rounded,
    habitsCompleted: habitsDone,
    habitsTotal,
    phasesCompleted: phasesDone,
    phasesTotal,
    xpEarned: rounded,
  };
  await db
    .insert(dailyScores)
    .values({ userId, date, ...values })
    .onConflictDoUpdate({ target: [dailyScores.userId, dailyScores.date], set: values });
  await evaluateAchievements(userId);
  return rounded;
}

/* Streaks ---------------------------------------------------------------- */

export function computeStreak(
  days: DayScore[],
  threshold = 80,
  today: string = serverTodayKey(),
): { current: number; best: number } {
  const map = new Map(days.map((d) => [d.date, d.score]));
  let current = 0;
  let cursor = (map.get(today) ?? -1) >= threshold ? today : addDays(today, -1);
  while ((map.get(cursor) ?? -1) >= threshold) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const consecutive = previous !== null && diffDays(d.date, previous) === 1;
    run = d.score >= threshold ? (consecutive ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    previous = d.date;
  }
  return { current, best };
}

/** Longest run of consecutive calendar days in `dates`. */
export function longestRun(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && diffDays(sorted[i], sorted[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/* Pillar scores from K habits over a period ------------------------------ */

export async function pillarScores(
  fromDate: string,
  toDate: string,
  userId: string = currentUserId(),
): Promise<Record<string, number>> {
  const db = getDb();
  const [activeHabits, checkIns] = await Promise.all([
    db
      .select({ id: habit.id, pillar: habit.pillar, cadence: habit.cadence, timesPerWeek: habit.timesPerWeek })
      .from(habit)
      .where(and(eq(habit.userId, userId), inArray(habit.status, [...ACTIVE_STATUSES]))),
    db
      .select({ habitId: habitCheckIn.habitId })
      .from(habitCheckIn)
      .where(and(eq(habitCheckIn.userId, userId), gte(habitCheckIn.day, fromDate), lte(habitCheckIn.day, toDate))),
  ]);
  const days = Math.max(1, diffDays(toDate, fromDate) + 1);
  const result: Record<string, number> = {};
  for (const p of PILLARS) {
    const pillarHabits = activeHabits.filter((h) => h.pillar === p.key);
    const possible = pillarHabits.reduce(
      (sum, h) => sum + (h.cadence === "daily" ? days : ((h.timesPerWeek ?? 1) * days) / 7),
      0,
    );
    const ids = new Set(pillarHabits.map((h) => h.id));
    const done = checkIns.filter((c) => ids.has(c.habitId)).length;
    result[p.key] = possible > 0 ? Math.min(100, Math.round((done / possible) * 100)) : 0;
  }
  return result;
}

/* Badges ----------------------------------------------------------------- */

async function completedPhaseDates(userId: string, match: (key: string) => boolean) {
  const rows = await getDb()
    .select({ date: phaseEntries.date, phaseKey: phaseEntries.phaseKey })
    .from(phaseEntries)
    .where(and(eq(phaseEntries.userId, userId), eq(phaseEntries.status, "completed")));
  return rows.filter((r) => match(r.phaseKey)).map((r) => r.date);
}

export async function evaluateAchievements(userId: string = currentUserId()) {
  const db = getDb();
  await db
    .insert(achievements)
    .values(DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a, userId })))
    .onConflictDoNothing({ target: [achievements.userId, achievements.code] });

  const locked = new Set(
    (
      await db
        .select({ code: achievements.code })
        .from(achievements)
        .where(and(eq(achievements.userId, userId), eq(achievements.isUnlocked, false)))
    ).map((a) => a.code),
  );
  if (locked.size === 0) return;
  const earned: string[] = [];
  const check = async (code: string, test: () => Promise<boolean>) => {
    if (locked.has(code) && (await test())) earned.push(code);
  };

  const scores = await db
    .select({ date: dailyScores.date, score: dailyScores.score })
    .from(dailyScores)
    .where(eq(dailyScores.userId, userId))
    .orderBy(asc(dailyScores.date));

  await check("premier_feu", async () => scores.some((s) => s.score >= 100));
  await check("semaine_fer", async () => computeStreak(scores, 80).best >= 7);
  await check("mois_acier", async () => computeStreak(scores, 70).best >= 30);
  await check("maitre_aube", async () => longestRun(await completedPhaseDates(userId, (k) => k === "lever")) >= 30);
  await check(
    "esprit_aiguise",
    async () => longestRun(await completedPhaseDates(userId, (k) => k.startsWith("deepwork"))) >= 30,
  );
  await check(
    "stoicien",
    async () => longestRun(await completedPhaseDates(userId, (k) => k.includes("meditation"))) >= 30,
  );
  await check("temple", async () => {
    const dates = (
      await db.select({ date: workouts.date }).from(workouts).where(eq(workouts.userId, userId))
    )
      .map((w) => w.date)
      .sort();
    return dates.some((d) => dates.filter((x) => x >= addDays(d, -29) && x <= d).length >= 30);
  });
  await check("artisan", async () => {
    const done = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, "completed")))
      .limit(1);
    return done.length > 0;
  });
  await check("conseil", async () => {
    const circle = (
      await db
        .select({ id: people.id, intimacy: people.intimacy, isSelf: people.isSelf })
        .from(people)
        .where(eq(people.userId, userId))
    )
      .filter((p) => !p.isSelf && p.intimacy >= INNER_CIRCLE_MIN)
      .map((p) => p.id);
    if (circle.length === 0) return false;
    const contacts = await db
      .select({ date: personInteractions.date })
      .from(personInteractions)
      .where(and(eq(personInteractions.userId, userId), inArray(personInteractions.personId, circle)));
    return new Set(contacts.map((c) => weekStartOf(c.date))).size >= 4;
  });
  await check("scribe", async () => {
    const rows = await db
      .select({ id: logbookEntries.id })
      .from(logbookEntries)
      .where(eq(logbookEntries.userId, userId))
      .limit(7);
    return rows.length >= 7;
  });
  await check("horloger", async () => {
    const rows = await db
      .select({ id: timerHistory.id })
      .from(timerHistory)
      .where(eq(timerHistory.userId, userId))
      .limit(10);
    return rows.length >= 10;
  });

  if (earned.length) {
    await db
      .update(achievements)
      .set({ isUnlocked: true, unlockedAt: serverTodayKey() })
      .where(and(eq(achievements.userId, userId), inArray(achievements.code, earned)));
  }
}
