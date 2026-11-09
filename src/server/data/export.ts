import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { habitCheckIn } from "../db/schema";
import { listHealthLogs, listJournalEntries } from "./entries";
import { listHabits } from "./habits";
import { findProfile } from "./profile";
import { listAudits, listMilestones, listReviews } from "./progress";

/** Full decrypted export of the user's data (GDPR right of access/portability). */
export async function exportUserData(userId: string) {
  const [profile, habits, checkIns, journal, health, audits, milestones, reviews] = await Promise.all([
    findProfile(userId),
    listHabits(userId),
    db
      .select({ habitId: habitCheckIn.habitId, day: habitCheckIn.day })
      .from(habitCheckIn)
      .where(eq(habitCheckIn.userId, userId))
      .orderBy(asc(habitCheckIn.day)),
    listJournalEntries(userId),
    listHealthLogs(userId, "1970-01-01", "9999-12-31"),
    listAudits(userId),
    listMilestones(userId),
    listReviews(userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    format: "k-coach-export/1",
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
  };
}
