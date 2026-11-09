import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { habitCheckIn } from "../db/schema";
import { listHealthLogs, listJournalEntries } from "./entries";
import { listHabits } from "./habits";
import { findProfile } from "./profile";
import { listAudits, listMilestones, listReviews } from "./progress";
import { withUserData } from "../crypto/user-scope";
import { exportLifeData } from "@/features/settings/server/life-export";

/** Full decrypted export of the user's data (GDPR right of access/portability). */
export async function exportUserData(userId: string) {
  const [profile, habits, checkIns, journal, health, audits, milestones, reviews, life] = await Promise.all([
    findProfile(userId),
    listHabits(userId),
    getDb()
      .select({ habitId: habitCheckIn.habitId, day: habitCheckIn.day })
      .from(habitCheckIn)
      .where(eq(habitCheckIn.userId, userId))
      .orderBy(asc(habitCheckIn.day)),
    listJournalEntries(userId),
    listHealthLogs(userId, "1970-01-01", "9999-12-31"),
    listAudits(userId),
    listMilestones(userId),
    listReviews(userId),
    withUserData(userId, exportLifeData),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    // 2: adds `life`, the modules merged from NYX-KAIROS (ADR 0010).
    format: "k-coach-export/2",
    profile: profile && {
      timeZone: profile.timeZone,
      programStart: profile.programStart,
      schedule: profile.schedule,
      microThresholds: profile.microThresholds,
    },
    habits,
    checkIns,
    journal,
    health,
    audits,
    milestones: milestones.map(({ phaseId, title, doneOn }) => ({ phaseId, title, doneOn })),
    reviews,
    life,
  };
}
