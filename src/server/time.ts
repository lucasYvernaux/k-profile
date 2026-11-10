import "server-only";

/*
 * Business clock for server code.
 *
 * Business dates ("YYYY-MM-DD") are in the user's local time (docs/architecture.md),
 * but the server runs in UTC on Cloudflare Workers. `todayKey()` from
 * src/shared/lib/dates.ts reads the machine clock, so on the server it returned the
 * previous day between midnight and 1-2 a.m. in France. Server code uses this
 * module instead; browser code keeps `todayKey()` (the device's own time zone).
 */

/** Time zone of the single user (IANA name). */
export const APP_TIME_ZONE = "Europe/Paris";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type ZonedNow = { dateKey: string; hour: number; minute: number };

/** Calendar date and wall-clock time in APP_TIME_ZONE. */
export function zonedNow(now: Date = new Date()): ZonedNow {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(now)) parts[part.type] = part.value;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Today's business date ("YYYY-MM-DD") in APP_TIME_ZONE. */
export function serverTodayKey(): string {
  return zonedNow().dateKey;
}
