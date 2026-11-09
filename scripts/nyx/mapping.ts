/*
 * Pure mapping rules for the one-shot NYX-KAIROS → K data migration
 * (scripts/migrate-nyx.ts, ADR 0010). Kept apart so they are unit tested.
 */
import { PILLAR_IDS, type PillarId } from "../../src/domain/pillars";
import { NYX_PILLAR_TO_K } from "../../src/shared/domain/constants";

/** snake_case row from `pg` → camelCase keys used by the Drizzle tables. */
export function camelize(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()), value]),
  );
}

/** NYX pillar key → K pillar (already-K keys are kept, unknown keys become null). */
export function mapPillar(key: unknown): PillarId | null {
  if (typeof key !== "string" || key === "") return null;
  if ((PILLAR_IDS as readonly string[]).includes(key)) return key as PillarId;
  return NYX_PILLAR_TO_K[key] ?? null;
}

/**
 * Monthly audit pillar scores (JSON {pillar: 0-10}). Two NYX pillars map to
 * K "maker" (académie, artisanat): their scores are averaged.
 */
export function mapPillarScores(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const sums = new Map<PillarId, { total: number; count: number }>();
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const pillar = mapPillar(key);
    if (!pillar || typeof value !== "number" || !Number.isFinite(value)) continue;
    const current = sums.get(pillar) ?? { total: 0, count: 0 };
    sums.set(pillar, { total: current.total + value, count: current.count + 1 });
  }
  if (sums.size === 0) return null;
  return JSON.stringify(
    Object.fromEntries([...sums].map(([pillar, { total, count }]) => [pillar, Math.round((total / count) * 10) / 10])),
  );
}

export type KCadence = { cadence: "daily" | "weekly"; timesPerWeek: number | null };

/** NYX habit frequency (daily | weekly | xweek | monthly) → K cadence (daily | weekly n×). */
export function mapHabitCadence(frequency: unknown, timesPerWeek: unknown): KCadence {
  if (frequency === "daily" || frequency == null) return { cadence: "daily", timesPerWeek: null };
  const wanted = typeof timesPerWeek === "number" && Number.isFinite(timesPerWeek) ? Math.round(timesPerWeek) : 1;
  const times = frequency === "xweek" ? wanted : 1;
  return { cadence: "weekly", timesPerWeek: Math.min(7, Math.max(1, times)) };
}

/** Keeps the last row (highest id) for each key: NYX allowed duplicates where K has a unique index. */
export function lastByKey<T extends { id: number }>(rows: readonly T[], keyOf: (row: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const row of [...rows].sort((a, b) => a.id - b.id)) byKey.set(keyOf(row), row);
  return [...byKey.values()];
}
