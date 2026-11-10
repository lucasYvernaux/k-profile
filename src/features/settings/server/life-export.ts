import "server-only";
import { eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";

/*
 * Decrypted export of the "life" modules (GDPR access and portability, ADR
 * 0010). Must run inside withUserData(). The owner id is left out of each row.
 */

type OwnedTable = PgTable & { userId: AnyPgColumn };

const LIFE_TABLES = {
  settings: s.userSettings,
  routinePhases: s.phaseDefs,
  routineChecks: s.phaseEntries,
  upkeepTimers: s.timers,
  upkeepDone: s.timerHistory,
  intake: s.intakeLogs,
  bodyMetrics: s.bodyMetrics,
  workouts: s.workouts,
  logbook: s.logbookEntries,
  emotionLogs: s.emotionLogs,
  weeklyReviews: s.weeklyReviews,
  monthlyAudits: s.monthlyAudits,
  goals: s.goals,
  projects: s.projects,
  skills: s.skills,
  quotes: s.quotes,
  people: s.people,
  personLinks: s.personLinks,
  personInteractions: s.personInteractions,
  interests: s.interests,
  personInterests: s.personInterests,
  achievements: s.achievements,
  dailyScores: s.dailyScores,
} satisfies Record<string, OwnedTable>;

export type LifeExport = Record<keyof typeof LIFE_TABLES, Record<string, unknown>[]>;

export async function exportLifeData(): Promise<LifeExport> {
  const userId = currentUserId();
  const entries = await Promise.all(
    Object.entries(LIFE_TABLES).map(async ([key, table]) => {
      const rows = (await getDb()
        .select()
        .from(table as OwnedTable)
        .where(eq((table as OwnedTable).userId, userId))) as Record<string, unknown>[];
      return [key, rows.map(({ userId: _owner, ...row }) => row)] as const;
    }),
  );
  return Object.fromEntries(entries) as LifeExport;
}
