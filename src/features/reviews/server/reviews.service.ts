import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { monthlyAudits, weeklyReviews } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { definedOnly } from "@/shared/lib/validation";
import type { MonthlyAuditInput, ReviewsQuery, WeeklyReviewInput } from "../reviews.schemas";

const RECENT_WEEKS = 52;
const RECENT_MONTHS = 24;

const myWeeks = () => eq(weeklyReviews.userId, currentUserId());
const myMonths = () => eq(monthlyAudits.userId, currentUserId());

export async function getReviews(query: ReviewsQuery) {
  if (query.type === "weekly") {
    if (query.key) {
      return (
        (
          await getDb()
            .select()
            .from(weeklyReviews)
            .where(and(myWeeks(), eq(weeklyReviews.weekStart, query.key)))
            .limit(1)
        )[0] ?? null
      );
    }
    return getDb()
      .select()
      .from(weeklyReviews)
      .where(myWeeks())
      .orderBy(desc(weeklyReviews.weekStart))
      .limit(RECENT_WEEKS);
  }
  if (query.key) {
    return (
      (await getDb().select().from(monthlyAudits).where(and(myMonths(), eq(monthlyAudits.month, query.key))).limit(1))[0] ??
      null
    );
  }
  return getDb().select().from(monthlyAudits).where(myMonths()).orderBy(desc(monthlyAudits.month)).limit(RECENT_MONTHS);
}

export async function saveWeeklyReview(input: WeeklyReviewInput) {
  const { type: _type, weekStart, ...fields } = input; // `type` only routes the request
  const values = definedOnly(fields);
  await getDb()
    .insert(weeklyReviews)
    .values({ ...values, userId: currentUserId(), weekStart })
    .onConflictDoUpdate({
      target: [weeklyReviews.userId, weeklyReviews.weekStart],
      set: Object.keys(values).length ? values : { weekStart },
    });
}

export async function saveMonthlyAudit(input: MonthlyAuditInput) {
  const { type: _type, month, ...fields } = input; // `type` only routes the request
  const values = definedOnly(fields);
  await getDb()
    .insert(monthlyAudits)
    .values({ ...values, userId: currentUserId(), month })
    .onConflictDoUpdate({
      target: [monthlyAudits.userId, monthlyAudits.month],
      set: Object.keys(values).length ? values : { month },
    });
}
