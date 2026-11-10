import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userSettings } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { logger } from "@/server/log";

/*
 * Per-user key/value store for JSON settings (one row per feature
 * configuration). Values are sealed: they can hold health data (weight, sex).
 * Corrupted values fall back to the defaults instead of breaking the page.
 */

function ownKey(key: string) {
  return and(eq(userSettings.userId, currentUserId()), eq(userSettings.key, key));
}

export async function readJsonSetting<T>(key: string): Promise<Partial<T> | null> {
  const row = (await getDb().select().from(userSettings).where(ownKey(key)).limit(1))[0];
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Partial<T>;
  } catch {
    logger.warn("settings.corrupted_value", { key });
    return null;
  }
}

export async function writeJsonSetting(key: string, value: unknown): Promise<void> {
  const text = JSON.stringify(value);
  await getDb()
    .insert(userSettings)
    .values({ userId: currentUserId(), key, value: text })
    .onConflictDoUpdate({ target: [userSettings.userId, userSettings.key], set: { value: text } });
}

export async function deleteSetting(key: string): Promise<void> {
  await getDb().delete(userSettings).where(ownKey(key));
}
