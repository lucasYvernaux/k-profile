import { z } from "zod";
import { LIMITS, dateKey, id, optionalInt, optionalNumber, optionalText } from "@/shared/lib/validation";
import { WORKOUT_TYPES } from "./domain/health";

/** Measurements in cm: wide but finite bounds catch typos (e.g. 1800 instead of 180). */
const cm = optionalNumber(0, 400);

export const saveBodyMetricSchema = z.object({
  date: dateKey.optional(),
  weightKg: optionalNumber(1, 500),
  heightCm: optionalNumber(30, 260),
  bodyFatPct: optionalNumber(1, 80),
  neck: cm,
  shoulders: cm,
  chest: cm,
  waist: cm,
  hips: cm,
  arm: cm,
  forearm: cm,
  thigh: cm,
  calf: cm,
  notes: optionalText(LIMITS.text),
});

export const healthConfigSchema = z.object({
  weeklyGoal: z.coerce.number().int().min(1).max(14).optional(),
  targetWeightKg: optionalNumber(1, 500),
  sex: z.enum(["homme", "femme"]).optional(),
});

const exercise = z.object({
  name: z.string().trim().max(120),
  sets: optionalInt(0, 100),
  reps: optionalInt(0, 1_000),
  /** Charge, or for bodyweight exercises the added load (negative = assistance) */
  weight: optionalNumber(-200, 1_000),
  bw: z.boolean().optional(),
  /** Hold time per set, in seconds (plank, L-sit…) */
  seconds: optionalInt(0, 36_000),
});

export const workoutSchema = z.object({
  date: dateKey.optional(),
  type: z.enum(Object.keys(WORKOUT_TYPES) as [string, ...string[]]).optional(),
  title: optionalText(LIMITS.name),
  durationMin: optionalInt(0, 1_440),
  intensity: optionalInt(1, 10),
  calories: optionalInt(0, 20_000),
  distanceKm: optionalNumber(0, 1_000),
  exercises: z.array(exercise).max(100).optional(),
  notes: optionalText(LIMITS.text),
});

export const updateWorkoutSchema = workoutSchema.extend({ id });

export type SaveBodyMetricInput = z.infer<typeof saveBodyMetricSchema>;
export type HealthConfigPatch = z.infer<typeof healthConfigSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
