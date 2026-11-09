import { z } from "zod";
import { addDays, daysBetween, isDayKey, type DayKey } from "./dates";
import { consecutiveMissedDays, type CheckIn, type Habit } from "./habits";
import { ALCOHOL_GUIDELINES } from "./sources";

/**
 * Kind vigilance signals (brief, V2 item 11). They never blame: each one
 * suggests an adjustment. The thresholds below are design choices, except
 * the alcohol guidelines which come from Santé publique France.
 */
export const SHORT_SLEEP_HOURS = 6;
export const SHORT_SLEEP_NIGHTS = 3;
export const FAMILY_SILENCE_WEEKS = 3;
export const MISSED_DAYS_NUDGE = 3;

export const dailyLogSchema = z.object({
  day: z.string().refine(isDayKey, { message: "Date invalide." }),
  sleepHours: z.coerce.number().min(0).max(24).nullable(),
  drinks: z.coerce.number().int().min(0).max(50).nullable(),
});

export type DailyLog = z.infer<typeof dailyLogSchema>;

export type VigilanceSignal =
  | { kind: "short-sleep"; nights: number }
  | { kind: "family-silence"; weeks: number }
  | { kind: "alcohol-day"; day: DayKey; drinks: number }
  | { kind: "alcohol-week"; drinks: number }
  | { kind: "alcohol-no-free-day" }
  | { kind: "missed-days"; habitTitle: string; days: number };

function logsByDay(logs: readonly DailyLog[]): Map<DayKey, DailyLog> {
  return new Map(logs.map((log) => [log.day, log]));
}

/** Consecutive recorded nights under the threshold, ending yesterday or today. */
export function shortSleepStreak(logs: readonly DailyLog[], today: DayKey): number {
  const byDay = logsByDay(logs);
  let day = byDay.get(today)?.sleepHours != null ? today : addDays(today, -1);
  let nights = 0;
  for (;;) {
    const hours = byDay.get(day)?.sleepHours;
    if (hours == null || hours >= SHORT_SLEEP_HOURS) {
      return nights;
    }
    nights += 1;
    day = addDays(day, -1);
  }
}

/** Alcohol signals over the 7 days ending today (only days with data). */
export function alcoholSignals(logs: readonly DailyLog[], today: DayKey): VigilanceSignal[] {
  const byDay = logsByDay(logs);
  const week = Array.from({ length: 7 }, (_, offset) => byDay.get(addDays(today, -offset)))
    .filter((log): log is DailyLog => log?.drinks != null);
  const signals: VigilanceSignal[] = [];

  for (const log of week) {
    if ((log.drinks ?? 0) > ALCOHOL_GUIDELINES.maxDrinksPerDay) {
      signals.push({ kind: "alcohol-day", day: log.day, drinks: log.drinks ?? 0 });
    }
  }
  const total = week.reduce((sum, log) => sum + (log.drinks ?? 0), 0);
  if (total > ALCOHOL_GUIDELINES.maxDrinksPerWeek) {
    signals.push({ kind: "alcohol-week", drinks: total });
  }
  if (week.length === 7 && week.every((log) => (log.drinks ?? 0) > 0)) {
    signals.push({ kind: "alcohol-no-free-day" });
  }
  return signals;
}

export interface VigilanceInput {
  today: DayKey;
  logs: readonly DailyLog[];
  habits: readonly Habit[];
  checkIns: readonly CheckIn[];
  /** Day of the last recorded family activity (family habit check-in). */
  lastFamilyActivity: DayKey | null;
  programStart: DayKey;
}

export function vigilanceSignals(input: VigilanceInput): VigilanceSignal[] {
  const signals: VigilanceSignal[] = [];

  const nights = shortSleepStreak(input.logs, input.today);
  if (nights >= SHORT_SLEEP_NIGHTS) {
    signals.push({ kind: "short-sleep", nights });
  }

  const silenceSince = input.lastFamilyActivity ?? input.programStart;
  const weeks = Math.floor(daysBetween(silenceSince, input.today) / 7);
  if (weeks >= FAMILY_SILENCE_WEEKS) {
    signals.push({ kind: "family-silence", weeks });
  }

  signals.push(...alcoholSignals(input.logs, input.today));

  for (const habit of input.habits) {
    if (habit.status !== "forming") {
      continue;
    }
    const days = consecutiveMissedDays(habit, input.checkIns, input.today);
    if (days >= MISSED_DAYS_NUDGE) {
      signals.push({ kind: "missed-days", habitTitle: habit.title, days });
    }
  }
  return signals;
}

/** Kind, non-judgmental wording for each signal. */
export function describeSignal(signal: VigilanceSignal): { title: string; suggestion: string } {
  switch (signal.kind) {
    case "short-sleep":
      return {
        title: `Moins de ${SHORT_SLEEP_HOURS} h de sommeil depuis ${signal.nights} nuits`,
        suggestion:
          "Et si tu allégeais la charge cette semaine ? Mettre une habitude en pause libère de l'énergie sans rien casser.",
      };
    case "family-silence":
      return {
        title: `Pas d'activité « famille choisie » depuis ${signal.weeks} semaines`,
        suggestion: "Un message ou un appel court à un proche suffit à reprendre le fil.",
      };
    case "alcohol-day":
      return {
        title: `${signal.drinks} verres le ${signal.day}`,
        suggestion: `Le repère est de ${ALCOHOL_GUIDELINES.maxDrinksPerDay} verres maximum par jour.`,
      };
    case "alcohol-week":
      return {
        title: `${signal.drinks} verres sur les 7 derniers jours`,
        suggestion: `Le repère est de ${ALCOHOL_GUIDELINES.maxDrinksPerWeek} verres maximum par semaine.`,
      };
    case "alcohol-no-free-day":
      return {
        title: "Aucun jour sans alcool sur les 7 derniers jours",
        suggestion: "Les repères recommandent des jours sans consommation dans la semaine.",
      };
    case "missed-days":
      return {
        title: `« ${signal.habitTitle} » non cochée depuis ${signal.days} jours`,
        suggestion:
          "Ce n'est pas un échec. Reprends avec une version plus petite aujourd'hui, ou mets-la en pause si ce n'est pas le moment.",
      };
  }
}
