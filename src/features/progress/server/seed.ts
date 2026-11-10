import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { achievements, phaseDefs, quotes, timers } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { allQuoteSeeds } from "@/features/manifesto/domain/quotes";
import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_TIMERS,
  PHASES,
  QUOTES,
  SUNDAY_ONLY,
  SUNDAY_PHASES,
  WEEKDAYS_MON_SAT,
} from "@/shared/domain/constants";
import { addDays } from "@/shared/lib/dates";
import { serverTodayKey } from "@/server/time";

/*
 * Idempotent per-user seed of the "life" modules: routine phases, quotes,
 * upkeep timers and badges. Each part is seeded only when the user has none,
 * so deleting everything on purpose is respected only for the parts left.
 */

async function hasAny(table: typeof phaseDefs | typeof quotes | typeof timers | typeof achievements) {
  const rows = await getDb().select({ id: table.id }).from(table).where(eq(table.userId, currentUserId())).limit(1);
  return rows.length > 0;
}

export async function ensureSeeded() {
  const userId = currentUserId();
  if (!(await hasAny(phaseDefs))) await seedPhases();

  if (!(await hasAny(quotes))) {
    await getDb()
      .insert(quotes)
      .values(
        allQuoteSeeds(QUOTES).map((q) => ({
          userId,
          text: q.text,
          author: q.author,
          source: q.source ?? null,
          character: q.character ?? null,
          isVerbatim: q.isVerbatim ?? true,
          category: q.category,
        })),
      );
  }

  if (!(await hasAny(timers))) {
    const today = serverTodayKey();
    await getDb()
      .insert(timers)
      .values(
        DEFAULT_TIMERS.map((t) => ({
          userId,
          name: t.name,
          description: t.description ?? null,
          icon: t.icon,
          category: t.category,
          frequencyDays: t.frequencyDays,
          lastDone: today,
          nextDue: addDays(today, t.frequencyDays),
        })),
      );
  }

  await getDb()
    .insert(achievements)
    .values(DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a, userId })))
    .onConflictDoNothing({ target: [achievements.userId, achievements.code] });
}

/** (Re)installs the two default routines: weekdays (Mon → Sat) and Sunday. */
export async function seedPhases() {
  const userId = currentUserId();
  const rows = [
    ...PHASES.map((p, i) => ({ p, days: WEEKDAYS_MON_SAT, sortOrder: i })),
    ...SUNDAY_PHASES.map((p, i) => ({ p, days: SUNDAY_ONLY, sortOrder: 100 + i })),
  ];
  await getDb()
    .insert(phaseDefs)
    .values(
      rows.map(({ p, days, sortOrder }) => ({
        userId,
        key: p.key,
        title: p.title,
        startTime: p.start,
        endTime: p.end,
        icon: p.icon,
        daysOfWeek: JSON.stringify(days),
        sortOrder,
      })),
    )
    .onConflictDoNothing({ target: [phaseDefs.userId, phaseDefs.key] });
}

/** Deletes the user's phases (not their history) before a reset. */
export async function deleteAllPhases() {
  await getDb().delete(phaseDefs).where(and(eq(phaseDefs.userId, currentUserId())));
}
