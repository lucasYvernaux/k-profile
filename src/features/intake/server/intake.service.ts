import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { intakeLogs } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { gramsOfAlcohol, gramsToUnits, unitsToGrams } from "@/features/intake/domain/intake";
import { serverTodayKey, zonedNow } from "@/server/time";
import type { CreateIntakeInput } from "../intake.schemas";
import { readConfig } from "./intake-config";

const round2 = (n: number) => Math.round(n * 100) / 100;

const mine = () => eq(intakeLogs.userId, currentUserId());

export async function getIntakeDay(query: { date?: string; from?: string; to?: string }) {
  const date = query.date ?? serverTodayKey();
  const [config, today, range] = await Promise.all([
    readConfig(),
    getDb()
      .select()
      .from(intakeLogs)
      .where(and(mine(), eq(intakeLogs.date, date)))
      .orderBy(desc(intakeLogs.hour), desc(intakeLogs.minute), desc(intakeLogs.id)),
    query.from && query.to
      ? getDb()
          .select()
          .from(intakeLogs)
          .where(and(mine(), gte(intakeLogs.date, query.from), lte(intakeLogs.date, query.to)))
          .orderBy(asc(intakeLogs.date))
      : Promise.resolve([]),
  ]);
  return { config, today, range, date };
}

/** Alcohol: label format (cL + % vol) → grams of pure alcohol → standard units. */
function alcoholAmounts(input: CreateIntakeInput): { amount: number; grams: number | null } {
  if (input.kind !== "alcohol") return { amount: input.amount ?? 0, grams: null };
  if (input.volumeCl && input.abv) {
    const grams = round2(gramsOfAlcohol(input.volumeCl, input.abv));
    return { amount: round2(gramsToUnits(grams)), grams };
  }
  const amount = input.amount ?? 0;
  return { amount, grams: round2(unitsToGrams(amount)) };
}

export async function addIntake(input: CreateIntakeInput) {
  const now = zonedNow();
  const { amount, grams } = alcoholAmounts(input);
  const [row] = await getDb()
    .insert(intakeLogs)
    .values({
      userId: currentUserId(),
      date: input.date ?? now.dateKey,
      kind: input.kind,
      amount,
      label: input.label ?? null,
      volumeCl: input.volumeCl ?? null,
      abv: input.abv ?? null,
      grams,
      hour: input.hour ?? now.hour,
      minute: input.minute ?? now.minute,
    })
    .returning();
  return row;
}

export async function deleteIntake(intakeId: number) {
  await getDb().delete(intakeLogs).where(and(mine(), eq(intakeLogs.id, intakeId)));
}
