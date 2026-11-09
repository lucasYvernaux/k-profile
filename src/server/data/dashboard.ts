import "server-only";
import { addDays, type DayKey } from "@/domain/dates";
import { pillarIndicators } from "@/domain/indicators";
import { listHealthLogs, listJournalEntries } from "./entries";
import { loadHabitState } from "./habits";
import { listAudits } from "./progress";

export async function loadIndicators(userId: string, today: DayKey) {
  const [{ habits, checkIns }, journal, healthLogs, audits] = await Promise.all([
    loadHabitState(userId, today),
    listJournalEntries(userId),
    listHealthLogs(userId, addDays(today, -6), today),
    listAudits(userId),
  ]);
  const baseline = audits.find((audit) => audit.kind === "baseline")?.data ?? null;
  return {
    habits,
    checkIns,
    indicators: pillarIndicators({
      today,
      habits,
      checkIns,
      journalDays: journal.map((entry) => entry.day),
      healthLogs,
      baseline,
    }),
  };
}
