/**
 * Calendar-day helpers. A "day key" is an ISO date string (YYYY-MM-DD)
 * in the user's time zone. Arithmetic is done in UTC on the key itself so
 * daylight-saving changes never shift a day.
 */

export type DayKey = string;

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export const DEFAULT_TIME_ZONE = "Europe/Paris";

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) {
    return false;
  }
  const date = parseDayKey(value);
  return formatUtcDate(date) === value;
}

export function assertDayKey(value: unknown): DayKey {
  if (!isDayKey(value)) {
    throw new RangeError(`Invalid day key: ${String(value)}`);
  }
  return value;
}

function parseDayKey(dayKey: DayKey): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

/** Returns the calendar day of `instant` in `timeZone`. */
export function toDayKey(instant: Date, timeZone = DEFAULT_TIME_ZONE): DayKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function addDays(dayKey: DayKey, days: number): DayKey {
  const date = parseDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

/** Adds calendar months, clamping to the last day of the target month. */
export function addMonths(dayKey: DayKey, months: number): DayKey {
  const date = parseDayKey(dayKey);
  const targetMonthIndex = date.getUTCMonth() + months;
  const lastDayOfTarget = new Date(
    Date.UTC(date.getUTCFullYear(), targetMonthIndex + 1, 0),
  ).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTarget);
  return formatUtcDate(
    new Date(Date.UTC(date.getUTCFullYear(), targetMonthIndex, day)),
  );
}

/** Number of days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round(
    (parseDayKey(to).getTime() - parseDayKey(from).getTime()) / MS_PER_DAY,
  );
}

/** Inclusive list of day keys from `from` to `to`. Empty if `to` < `from`. */
export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const length = daysBetween(from, to) + 1;
  return Array.from({ length: Math.max(0, length) }, (_, index) =>
    addDays(from, index),
  );
}

export function maxDayKey(a: DayKey, b: DayKey): DayKey {
  return a > b ? a : b;
}

export function monthKey(dayKey: DayKey): string {
  return dayKey.slice(0, 7);
}

export type QuarterKey = `${number}-Q${1 | 2 | 3 | 4}`;

export function quarterKey(dayKey: DayKey): QuarterKey {
  const [year, month] = dayKey.split("-").map(Number);
  const quarter = (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  return `${year}-Q${quarter}`;
}

export function quarterBounds(quarter: QuarterKey): { start: DayKey; end: DayKey } {
  const [yearPart, quarterPart] = quarter.split("-Q");
  const year = Number(yearPart);
  const firstMonth = (Number(quarterPart) - 1) * 3;
  const start = formatUtcDate(new Date(Date.UTC(year, firstMonth, 1)));
  const end = formatUtcDate(new Date(Date.UTC(year, firstMonth + 3, 0)));
  return { start, end };
}

export function previousQuarter(quarter: QuarterKey): QuarterKey {
  const { start } = quarterBounds(quarter);
  return quarterKey(addDays(start, -1));
}
