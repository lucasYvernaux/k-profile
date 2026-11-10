import "server-only";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { bodyMetrics, workouts } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { readConfig as readIntakeConfig, writeConfig as writeIntakeConfig } from "@/features/intake/server/intake-config";
import { readJsonSetting, writeJsonSetting } from "@/features/settings/server/settings-store";
import { evaluateAchievements } from "@/features/progress/server/progress.service";
import { serverTodayKey } from "@/server/time";
import { DEFAULT_SANTE, NUMERIC_FIELDS, type SanteConfig } from "../domain/health";
import type { HealthConfigPatch, SaveBodyMetricInput, WorkoutInput } from "../health.schemas";

const CONFIG_KEY = "sante_config";
const MAX_WORKOUTS = 1_000;

const myMetrics = () => eq(bodyMetrics.userId, currentUserId());
const myWorkouts = () => eq(workouts.userId, currentUserId());

/** Sex is shared with the intake config (blood alcohol estimate). */
export async function readHealthConfig(): Promise<SanteConfig> {
  const stored = (await readJsonSetting<SanteConfig>(CONFIG_KEY)) ?? {};
  const intake = await readIntakeConfig();
  return { ...DEFAULT_SANTE, ...stored, sex: intake.bodySex };
}

export async function updateHealthConfig(patch: HealthConfigPatch): Promise<SanteConfig> {
  const current = await readHealthConfig();
  const next: SanteConfig = {
    weeklyGoal: patch.weeklyGoal ?? current.weeklyGoal,
    targetWeightKg: patch.targetWeightKg !== undefined ? patch.targetWeightKg : current.targetWeightKg,
    sex: patch.sex ?? current.sex,
  };
  await writeJsonSetting(CONFIG_KEY, { weeklyGoal: next.weeklyGoal, targetWeightKg: next.targetWeightKg });
  if (patch.sex) await writeIntakeConfig({ bodySex: patch.sex });
  return next;
}

export async function listBodyMetrics() {
  const rows = await getDb().select().from(bodyMetrics).where(myMetrics()).orderBy(asc(bodyMetrics.date));
  return { rows, config: await readHealthConfig() };
}

/** One measurement row per date: saving a date replaces its values. */
export async function saveBodyMetric(input: SaveBodyMetricInput) {
  const date = input.date ?? serverTodayKey();
  const values: Partial<typeof bodyMetrics.$inferInsert> = { notes: input.notes ?? null };
  for (const field of NUMERIC_FIELDS) values[field] = input[field] ?? null;

  await getDb()
    .insert(bodyMetrics)
    .values({ ...values, userId: currentUserId(), date })
    .onConflictDoUpdate({ target: [bodyMetrics.userId, bodyMetrics.date], set: values });
  await syncIntakeWeight();
}

export async function deleteBodyMetric(metricId: number) {
  await getDb().delete(bodyMetrics).where(and(myMetrics(), eq(bodyMetrics.id, metricId)));
  await syncIntakeWeight();
}

/** The latest known weight feeds the blood alcohol estimate of the intake page. */
async function syncIntakeWeight() {
  const last = (
    await getDb()
      .select({ weightKg: bodyMetrics.weightKg })
      .from(bodyMetrics)
      .where(and(myMetrics(), isNotNull(bodyMetrics.weightKg)))
      .orderBy(desc(bodyMetrics.date))
      .limit(1)
  )[0];
  if (last?.weightKg) await writeIntakeConfig({ bodyWeightKg: last.weightKg });
}

export function listWorkouts() {
  return getDb()
    .select()
    .from(workouts)
    .where(myWorkouts())
    .orderBy(desc(workouts.date), desc(workouts.id))
    .limit(MAX_WORKOUTS);
}

function workoutValues(input: WorkoutInput) {
  const exercises = (input.exercises ?? []).filter((e) => e.name);
  return {
    date: input.date ?? serverTodayKey(),
    type: input.type ?? "autre",
    title: input.title ?? null,
    durationMin: input.durationMin ?? null,
    intensity: input.intensity ?? null,
    calories: input.calories ?? null,
    distanceKm: input.distanceKm ?? null,
    exercises: exercises.length ? JSON.stringify(exercises) : null,
    notes: input.notes ?? null,
  };
}

export async function createWorkout(input: WorkoutInput) {
  const [row] = await getDb()
    .insert(workouts)
    .values({ ...workoutValues(input), userId: currentUserId() })
    .returning();
  await evaluateAchievements();
  return row;
}

export async function updateWorkout(workoutId: number, input: WorkoutInput) {
  await getDb()
    .update(workouts)
    .set(workoutValues(input))
    .where(and(myWorkouts(), eq(workouts.id, workoutId)));
}

export async function deleteWorkout(workoutId: number) {
  await getDb().delete(workouts).where(and(myWorkouts(), eq(workouts.id, workoutId)));
}

