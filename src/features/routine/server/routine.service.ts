import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { phaseDefs, phaseEntries } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { notFound } from "@/server/http/errors";
import { recomputeDay } from "@/features/progress/server/progress.service";
import { deleteAllPhases, ensureSeeded, seedPhases } from "@/features/progress/server/seed";
import { serverTodayKey } from "@/server/time";
import { definedOnly } from "@/shared/lib/validation";
import type { CreatePhaseInput, RecordPhaseInput, UpdatePhaseInput } from "../routine.schemas";

/** URL-safe key derived from a title ("Déjeuner & Conseil" → "dejeuner-conseil"). */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `phase-${Date.now().toString(36)}`
  );
}

const mine = () => eq(phaseDefs.userId, currentUserId());
const ownPhase = (phaseId: number) => and(mine(), eq(phaseDefs.id, phaseId));

export async function listPhaseDefs() {
  await ensureSeeded();
  return getDb().select().from(phaseDefs).where(mine()).orderBy(asc(phaseDefs.startTime), asc(phaseDefs.sortOrder));
}

export async function createPhaseDef(input: CreatePhaseInput) {
  let key = slugify(input.key || input.title);
  const clash = await getDb()
    .select({ id: phaseDefs.id })
    .from(phaseDefs)
    .where(and(mine(), eq(phaseDefs.key, key)))
    .limit(1);
  if (clash.length > 0) key = `${key}-${Date.now().toString(36).slice(-4)}`;
  const [{ n }] = await getDb().select({ n: count() }).from(phaseDefs).where(mine());
  const [row] = await getDb()
    .insert(phaseDefs)
    .values({
      userId: currentUserId(),
      key,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      icon: input.icon ?? "flame",
      pillar: input.pillar ?? null,
      daysOfWeek: input.daysOfWeek ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? n,
    })
    .returning();
  return row;
}

export async function updatePhaseDef(phaseId: number, patch: UpdatePhaseInput) {
  const values = definedOnly(patch);
  if (Object.keys(values).length === 0) return;
  const updated = await getDb()
    .update(phaseDefs)
    .set(values)
    .where(ownPhase(phaseId))
    .returning({ id: phaseDefs.id });
  if (updated.length === 0) throw notFound("Phase introuvable");
}

/** Deletes a phase and its completion history. */
export async function deletePhaseDef(phaseId: number) {
  const userId = currentUserId();
  const row = (await getDb().select().from(phaseDefs).where(ownPhase(phaseId)).limit(1))[0];
  if (!row) return;
  await getDb().transaction(async (tx) => {
    await tx.delete(phaseEntries).where(and(eq(phaseEntries.userId, userId), eq(phaseEntries.phaseKey, row.key)));
    await tx.delete(phaseDefs).where(ownPhase(phaseId));
  });
}

/** Restores the default weekday and Sunday routines. */
export async function resetPhaseDefs() {
  await deleteAllPhases();
  await seedPhases();
  const [{ n }] = await getDb().select({ n: count() }).from(phaseDefs).where(mine());
  return { ok: true, count: n };
}

export function listPhaseEntries(date = serverTodayKey()) {
  return getDb()
    .select()
    .from(phaseEntries)
    .where(and(eq(phaseEntries.userId, currentUserId()), eq(phaseEntries.date, date)));
}

export async function recordPhase(input: RecordPhaseInput) {
  const userId = currentUserId();
  const date = input.date ?? serverTodayKey();
  const sameDay = and(
    eq(phaseEntries.userId, userId),
    eq(phaseEntries.date, date),
    eq(phaseEntries.phaseKey, input.phaseKey),
  );
  if (input.clear) {
    await getDb().delete(phaseEntries).where(sameDay);
  } else {
    const notes = input.notes ?? null;
    await getDb()
      .insert(phaseEntries)
      .values({ userId, date, phaseKey: input.phaseKey, status: input.status, notes })
      .onConflictDoUpdate({
        target: [phaseEntries.userId, phaseEntries.date, phaseEntries.phaseKey],
        set: input.notes === undefined ? { status: input.status } : { status: input.status, notes },
      });
  }
  await recomputeDay(date);
}
