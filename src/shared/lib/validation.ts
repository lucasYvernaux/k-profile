import { z } from "zod";

/*
 * Reusable zod building blocks for API input validation (OWASP Input Validation
 * Cheat Sheet: allow-list, type, length and range checks at the trust boundary).
 *
 * Objects use zod's default "strip" mode: unknown keys are dropped, never written.
 * Form inputs often send "" for an empty field, so optional helpers map "" to null.
 */

/** "" → null. `undefined` is kept: an absent key must not erase a stored value on PATCH. */
const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

export const LIMITS = { name: 200, text: 5_000, longText: 20_000 } as const;

/** "YYYY-MM-DD" that is a real calendar date. */
export const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Date inexistante");

export const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois attendu au format AAAA-MM");

export const timeHM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue au format HH:mm");

/** Positive integer id, from a path segment or a query string. */
export const id = z.coerce.number().int().positive().max(2_147_483_647);

export const idParams = z.object({ id });
export const idQuery = z.object({ id });

export const requiredText = (max: number = LIMITS.name) => z.string().trim().min(1, "Champ requis").max(max);

export const optionalText = (max: number = LIMITS.text) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional();

export const optionalDate = z.preprocess(emptyToNull, dateKey.nullable()).optional();
export const optionalTime = z.preprocess(emptyToNull, timeHM.nullable()).optional();

export const optionalNumber = (min = -1_000_000, max = 1_000_000) =>
  z.preprocess(emptyToNull, z.coerce.number().finite().min(min).max(max).nullable()).optional();

export const optionalInt = (min = -1_000_000, max = 1_000_000) =>
  z.preprocess(emptyToNull, z.coerce.number().int().min(min).max(max).nullable()).optional();

/** Days of week (0 = Sunday): accepts an array or its JSON string, normalised to JSON text or null. */
export const daysOfWeekJson = z
  .union([z.array(z.number().int().min(0).max(6)).max(7), z.string().max(40), z.null()])
  .transform((value, ctx) => {
    if (value === null || value === "") return null;
    const days = typeof value === "string" ? safeJsonArray(value) : value;
    if (!days || !days.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)) {
      ctx.addIssue({ code: "custom", message: "Jours de la semaine invalides" });
      return z.NEVER;
    }
    return days.length ? JSON.stringify([...new Set(days as number[])].sort()) : null;
  });

/** Small JSON payload stored as text (lists of sub-items). Accepts an array or its JSON string. */
export const jsonArrayText = (item: z.ZodType, maxItems = 200) =>
  z.union([z.array(item).max(maxItems), z.string().max(LIMITS.longText), z.null()]).transform((value, ctx) => {
    if (value === null || value === "") return null;
    const parsed = typeof value === "string" ? safeJsonArray(value) : value;
    const checked = z.array(item).max(maxItems).safeParse(parsed);
    if (!checked.success) {
      ctx.addIssue({ code: "custom", message: "Liste invalide" });
      return z.NEVER;
    }
    return JSON.stringify(checked.data);
  });

/**
 * Parses a JSON array. Also unwraps one level of string encoding: older versions
 * of the journal/review routes double-encoded these lists (docs/dev-log/2026-11.md).
 */
function safeJsonArray(text: string): unknown[] | null {
  try {
    let value = JSON.parse(text);
    if (typeof value === "string") value = JSON.parse(value);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Removes keys whose value is undefined, so a PATCH only touches provided fields. */
export function definedOnly<T extends Record<string, unknown>>(object: T): Partial<T> {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined)) as Partial<T>;
}
