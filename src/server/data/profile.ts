import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DEFAULT_MICRO_THRESHOLDS_2026, type MicroThresholds } from "@/domain/business";
import { toDayKey, type DayKey } from "@/domain/dates";
import { DEFAULT_HABIT_QUEUE } from "@/domain/habit-catalog";
import { PHASES } from "@/domain/roadmap";
import { DEFAULT_SCHEDULE, type ScheduleBlock } from "@/domain/schedule";
import { db } from "../db/client";
import { habit, milestone, userProfile } from "../db/schema";
import { requireUser, type CurrentUser } from "../session";

export type Profile = typeof userProfile.$inferSelect;

export async function findProfile(userId: string): Promise<Profile | undefined> {
  return db.query.userProfile.findFirst({ where: eq(userProfile.userId, userId) });
}

/**
 * Creates the profile with its default habit queue and roadmap milestones.
 * Idempotent: does nothing if the profile already exists.
 */
export async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await findProfile(userId);
  if (existing) {
    return existing;
  }
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(userProfile)
      .values({
        userId,
        schedule: DEFAULT_SCHEDULE,
        microThresholds: DEFAULT_MICRO_THRESHOLDS_2026,
      })
      .onConflictDoNothing()
      .returning({ userId: userProfile.userId });
    if (inserted.length === 0) {
      return;
    }
    await tx.insert(habit).values(
      DEFAULT_HABIT_QUEUE.map((template, index) => ({
        userId,
        title: template.title,
        pillar: template.pillar,
        cadence: template.cadence.kind,
        timesPerWeek: template.cadence.kind === "weekly" ? template.cadence.timesPerWeek : null,
        status: "locked" as const,
        queueOrder: index + 1,
      })),
    );
    await tx.insert(milestone).values(
      PHASES.flatMap((phase) =>
        phase.milestones.map((title, position) => ({
          userId,
          phaseId: phase.id,
          title,
          position,
        })),
      ),
    );
  });
  const created = await findProfile(userId);
  if (!created) {
    throw new Error("Profile creation failed");
  }
  return created;
}

export interface AppContext {
  user: CurrentUser;
  profile: Profile & { programStart: DayKey };
  today: DayKey;
}

/** Signed-in, 2FA-enabled user who completed onboarding. */
export async function requireAppContext(): Promise<AppContext> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  if (!profile.onboardingCompletedAt || !profile.programStart) {
    redirect("/onboarding");
  }
  return {
    user,
    profile: { ...profile, programStart: profile.programStart },
    today: toDayKey(new Date(), profile.timeZone),
  };
}

export async function updateSchedule(userId: string, schedule: ScheduleBlock[]): Promise<void> {
  await db.update(userProfile).set({ schedule }).where(eq(userProfile.userId, userId));
}

export async function updateMicroThresholds(
  userId: string,
  thresholds: MicroThresholds,
): Promise<void> {
  await db
    .update(userProfile)
    .set({ microThresholds: thresholds })
    .where(eq(userProfile.userId, userId));
}
