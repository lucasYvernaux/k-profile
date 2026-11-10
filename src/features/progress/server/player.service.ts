import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { achievements, dailyScores, habitCheckIn, logbookEntries, phaseDefs, phaseEntries, workouts } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { levelFromXp, titleForLevel, xpForLevel } from "@/shared/domain/constants";
import { addDays, diffDays, minutesOf } from "@/shared/lib/dates";
import { serverTodayKey } from "@/server/time";
import { isGamificationEnabled } from "@/features/settings/server/gamification";
import { computeStreak, evaluateAchievements, pillarScores } from "./progress.service";

/**
 * Period statistics for the weekly and monthly reviews, plus the optional
 * gamification profile (XP, level, streaks, badges). When gamification is off
 * the profile fields are still returned but the screens hide them.
 */
export async function getPlayerProfile(range: { from?: string; to?: string }) {
  const userId = currentUserId();
  const db = getDb();
  const to = range.to ?? serverTodayKey();
  const from = range.from ?? addDays(to, -6);
  const length = Math.max(1, diffDays(to, from) + 1);
  const fromPrev = addDays(from, -length);
  const toPrev = addDays(to, -length);

  await evaluateAchievements(userId);
  const [gamification, scores, pillarsNow, pillarsPrev, phases, checks, checkIns, journals, sport, badges] =
    await Promise.all([
      isGamificationEnabled(),
      db.select().from(dailyScores).where(eq(dailyScores.userId, userId)).orderBy(asc(dailyScores.date)),
      pillarScores(from, to, userId),
      pillarScores(fromPrev, toPrev, userId),
      db.select().from(phaseDefs).where(eq(phaseDefs.userId, userId)),
      db
        .select({ phaseKey: phaseEntries.phaseKey })
        .from(phaseEntries)
        .where(
          and(
            eq(phaseEntries.userId, userId),
            eq(phaseEntries.status, "completed"),
            gte(phaseEntries.date, from),
            lte(phaseEntries.date, to),
          ),
        ),
      db
        .select({ day: habitCheckIn.day })
        .from(habitCheckIn)
        .where(and(eq(habitCheckIn.userId, userId), gte(habitCheckIn.day, from), lte(habitCheckIn.day, to))),
      db
        .select({ date: logbookEntries.date })
        .from(logbookEntries)
        .where(and(eq(logbookEntries.userId, userId), gte(logbookEntries.date, from), lte(logbookEntries.date, to))),
      db
        .select({ durationMin: workouts.durationMin })
        .from(workouts)
        .where(and(eq(workouts.userId, userId), gte(workouts.date, from), lte(workouts.date, to))),
      db.select().from(achievements).where(eq(achievements.userId, userId)).orderBy(asc(achievements.id)),
    ]);

  const totalXp = scores.reduce((sum, d) => sum + (d.xpEarned || 0), 0);
  const level = levelFromXp(totalXp);
  const title = titleForLevel(level);
  const xpInto = totalXp - xpForLevel(level);
  const xpNext = xpForLevel(level + 1) - xpForLevel(level);
  const streaks = computeStreak(scores, 80);

  const rangeScores = scores.filter((s) => s.date >= from && s.date <= to);
  const prevScores = scores.filter((s) => s.date >= fromPrev && s.date <= toPrev);
  const average = (rows: typeof scores) =>
    rows.length ? Math.round(rows.reduce((sum, d) => sum + d.score, 0) / rows.length) : null;

  // Minutes of completed routine phases, by kind of phase.
  const phaseMinutes = new Map(phases.map((p) => [p.key, Math.max(0, minutesOf(p.endTime) - minutesOf(p.startTime))]));
  const minutesOfPhases = (match: (key: string) => boolean) =>
    checks.filter((c) => match(c.phaseKey)).reduce((sum, c) => sum + (phaseMinutes.get(c.phaseKey) ?? 0), 0);

  return {
    gamification,
    xp: totalXp,
    level,
    levelName: title.name,
    levelSubtitle: title.subtitle,
    xpInto,
    xpNext,
    pctToNext: Math.min(100, Math.round((xpInto / Math.max(1, xpNext)) * 100)),
    todayScore: scores.find((s) => s.date === to)?.score ?? 0,
    streak: streaks.current,
    bestStreak: Math.max(streaks.best, streaks.current),
    pillars: pillarsNow,
    pillarsPrev,
    achievements: badges,
    range: {
      from,
      to,
      days: rangeScores,
      avgScore: average(rangeScores) ?? 0,
      avgPrev: average(prevScores),
      deepWorkMin: minutesOfPhases((k) => k.includes("deepwork")),
      trainingMin: sport.reduce((sum, w) => sum + (w.durationMin ?? 0), 0),
      practiceMin: minutesOfPhases((k) => k.includes("pratique")),
      readingMin: minutesOfPhases((k) => k.includes("lecture")),
      pagesRead: 0,
      medSessions: checks.filter((c) => c.phaseKey.includes("meditation")).length,
      journalDays: journals.length,
      habitDoneCount: checkIns.length,
    },
  };
}
