import { savingsMonths } from "./business";
import { addDays, monthKey, type DayKey } from "./dates";
import { journalDaysByMonth } from "./emotions";
import { completionRate, type CheckIn, type Habit } from "./habits";
import { PILLAR_IDS, type PillarId } from "./pillars";
import type { Audit } from "./audit";
import type { DailyLog } from "./vigilance";

export interface Indicator {
  label: string;
  value: string;
}

export interface IndicatorInput {
  today: DayKey;
  habits: readonly Habit[];
  checkIns: readonly CheckIn[];
  journalDays: readonly DayKey[];
  healthLogs: readonly DailyLog[];
  baseline: Audit | null;
}

const PERIOD_DAYS = 28;

function countSince(checkIns: readonly CheckIn[], habitIds: Set<string>, from: DayKey): number {
  return checkIns.filter((checkIn) => habitIds.has(checkIn.habitId) && checkIn.day >= from).length;
}

function euros(value: number | null | undefined): string {
  return value == null ? "non renseigné" : `${value.toLocaleString("fr-FR")} €`;
}

/** Indicators per pillar (brief, section 6), computed from what is tracked today. */
export function pillarIndicators(input: IndicatorInput): Record<PillarId, Indicator[]> {
  const from = addDays(input.today, -(PERIOD_DAYS - 1));
  const yesterday = addDays(input.today, -1);
  const result = Object.fromEntries(PILLAR_IDS.map((pillar) => [pillar, [] as Indicator[]])) as Record<PillarId, Indicator[]>;

  for (const pillar of PILLAR_IDS) {
    const active = input.habits.filter(
      (habit) => habit.pillar === pillar && (habit.status === "forming" || habit.status === "stable"),
    );
    if (active.length > 0) {
      const ids = new Set(active.map((habit) => habit.id));
      result[pillar].push({ label: `Actions cochées sur ${PERIOD_DAYS} jours`, value: String(countSince(input.checkIns, ids, from)) });
      for (const habit of active) {
        const rate = completionRate(habit, input.checkIns, yesterday);
        result[pillar].push({ label: habit.title, value: rate === null ? "trop tôt pour mesurer" : `${Math.round(rate * 100)} % sur 6 semaines` });
      }
    }
  }

  const journalThisMonth = journalDaysByMonth(input.journalDays).get(monthKey(input.today)) ?? 0;
  result.mental.unshift({ label: "Jours de journal ce mois-ci", value: String(journalThisMonth) });

  const lastWeek = input.healthLogs.filter((log) => log.day >= addDays(input.today, -6) && log.sleepHours != null);
  if (lastWeek.length > 0) {
    const average = lastWeek.reduce((sum, log) => sum + (log.sleepHours ?? 0), 0) / lastWeek.length;
    result.body.unshift({ label: "Sommeil moyen (7 jours)", value: `${average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h` });
  }

  const baseline = input.baseline;
  if (baseline) {
    const months = savingsMonths(baseline.money.savings ?? 0, baseline.money.monthlyExpenses ?? 0);
    result.strategy.push(
      { label: "Taux journalier (audit)", value: euros(baseline.business.dailyRate) },
      { label: "CA 12 mois (audit)", value: euros(baseline.business.revenueLast12Months) },
      { label: "Mois d'épargne de sécurité (audit)", value: months === null ? "non renseigné" : `${months.toLocaleString("fr-FR")} sur 6 visés` },
    );
  }
  return result;
}
