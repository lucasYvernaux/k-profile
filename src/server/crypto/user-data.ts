import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { userKey } from "../db/schema";
import { env } from "../env";
import { decrypt, encrypt, generateKey } from "./cipher";
import type { SealedField } from "./sealed-columns";

/**
 * Envelope encryption: each user has a random data key, stored wrapped
 * (encrypted) with the master key from DATA_ENCRYPTION_KEY. Deleting the
 * user deletes the wrapped key, which makes any leftover ciphertext (for
 * example in backups) unreadable. See ADR 0002.
 */
const MASTER_KEY_VERSION = 1;

function masterKey(): Buffer {
  return Buffer.from(env().DATA_ENCRYPTION_KEY, "base64");
}

function wrapContext(userId: string): string {
  return `user_key:${userId}`;
}

async function dataKeyFor(userId: string): Promise<Buffer> {
  const existing = await getDb().query.userKey.findFirst({ where: eq(userKey.userId, userId) });
  if (existing) {
    return decrypt(existing.wrappedKey, masterKey(), wrapContext(userId));
  }
  const key = generateKey();
  await getDb()
    .insert(userKey)
    .values({
      userId,
      wrappedKey: encrypt(key, masterKey(), wrapContext(userId)),
      masterKeyVersion: MASTER_KEY_VERSION,
    })
    .onConflictDoNothing();
  // Re-read in case a concurrent request created the key first.
  const stored = await getDb().query.userKey.findFirst({ where: eq(userKey.userId, userId) });
  if (!stored) {
    throw new Error("User data key could not be created");
  }
  return decrypt(stored.wrappedKey, masterKey(), wrapContext(userId));
}

export type FieldContext =
  | "audit.payload"
  | "daily_entry.priorities"
  | "daily_entry.health"
  | "journal_entry.payload"
  | "quarterly_review.payload"
  | "push_subscription.keys";

/** Per-user sealer: encrypts and decrypts JSON values bound to a field. */
export async function userCipher(userId: string) {
  const key = await dataKeyFor(userId);
  const context = (field: FieldContext | SealedField) => `${field}:${userId}`;
  return {
    seal(field: FieldContext | SealedField, value: unknown): string {
      return encrypt(JSON.stringify(value), key, context(field));
    },
    open<T>(field: FieldContext | SealedField, payload: string): T {
      return JSON.parse(decrypt(payload, key, context(field)).toString("utf8")) as T;
    },
  };
}

export type UserCipher = Awaited<ReturnType<typeof userCipher>>;
