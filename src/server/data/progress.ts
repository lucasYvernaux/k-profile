import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Audit } from "@/domain/audit";
import type { DayKey } from "@/domain/dates";
import type { QuarterlyReviewInput } from "@/domain/review";
import { userCipher } from "../crypto/user-data";
import { db } from "../db/client";
import { audit, milestone, quarterlyReview, userProfile } from "../db/schema";

/* Audit (Phase 0 baseline and follow-ups) ----------------------------- */

export interface AuditRecord {
  id: string;
  kind: "baseline" | "follow_up";
  takenOn: DayKey;
  data: Audit;
}

export async function saveBaselineAudit(userId: string, takenOn: DayKey, data: Audit): Promise<void> {
  const cipher = await userCipher(userId);
  await db.transaction(async (tx) => {
    await tx.insert(audit).values({
      userId,
      kind: "baseline",
      takenOn,
      payloadEnc: cipher.seal("audit.payload", data),
    });
    await tx
      .update(userProfile)
      .set({ programStart: takenOn, onboardingCompletedAt: new Date() })
      .where(eq(userProfile.userId, userId));
  });
}

export async function saveFollowUpAudit(userId: string, takenOn: DayKey, data: Audit): Promise<void> {
  const cipher = await userCipher(userId);
  await db.insert(audit).values({
    userId,
    kind: "follow_up",
    takenOn,
    payloadEnc: cipher.seal("audit.payload", data),
  });
}

export async function listAudits(userId: string): Promise<AuditRecord[]> {
  const rows = await db.query.audit.findMany({
    where: eq(audit.userId, userId),
    orderBy: [asc(audit.takenOn), asc(audit.createdAt)],
  });
  const cipher = await userCipher(userId);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    takenOn: row.takenOn,
    data: cipher.open<Audit>("audit.payload", row.payloadEnc),
  }));
}

/* Roadmap milestones ------------------------------------------------- */

export async function listMilestones(userId: string) {
  return db.query.milestone.findMany({
    where: eq(milestone.userId, userId),
    orderBy: [asc(milestone.phaseId), asc(milestone.position)],
  });
}

export async function setMilestoneDone(
  userId: string,
  milestoneId: string,
  doneOn: DayKey | null,
): Promise<void> {
  await db
    .update(milestone)
    .set({ doneOn })
    .where(and(eq(milestone.id, milestoneId), eq(milestone.userId, userId)));
}

/* Quarterly reviews -------------------------------------------------- */

export interface ReviewRecord extends QuarterlyReviewInput {
  id: string;
  updatedAt: string;
}

export async function saveReview(userId: string, review: QuarterlyReviewInput): Promise<void> {
  const cipher = await userCipher(userId);
  const payloadEnc = cipher.seal("quarterly_review.payload", review);
  await db
    .insert(quarterlyReview)
    .values({ userId, quarter: review.quarter, payloadEnc })
    .onConflictDoUpdate({
      target: [quarterlyReview.userId, quarterlyReview.quarter],
      set: { payloadEnc },
    });
}

export async function listReviews(userId: string): Promise<ReviewRecord[]> {
  const rows = await db.query.quarterlyReview.findMany({
    where: eq(quarterlyReview.userId, userId),
    orderBy: [desc(quarterlyReview.quarter)],
  });
  const cipher = await userCipher(userId);
  return rows.map((row) => ({
    id: row.id,
    updatedAt: row.updatedAt.toISOString(),
    ...cipher.open<QuarterlyReviewInput>("quarterly_review.payload", row.payloadEnc),
  }));
}
