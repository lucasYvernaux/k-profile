import { AsyncLocalStorage } from "node:async_hooks";
import { customType } from "drizzle-orm/pg-core";

/*
 * Transparent per-user encryption for the "life" modules (ADR 0010).
 *
 * A sealed column stores AES-256-GCM ciphertext (src/server/crypto/cipher.ts)
 * made with the data key of the user who owns the request. The key is loaded
 * once by `withUserData()` (src/server/crypto/user-scope.ts) and kept in an
 * AsyncLocalStorage, so Drizzle encrypts on write and decrypts on read.
 *
 * Rules:
 * - a sealed column can be written, read and tested for NULL, never compared
 *   or sorted in SQL (each value has a random IV): filter and sort in code;
 * - NULL stays NULL (Drizzle does not map nulls), so "is not null" still works;
 * - outside `withUserData()` any access throws: fail closed.
 *
 * This file has no "server-only" import because drizzle-kit loads the schema
 * outside Next.js. It holds no key: only the scope set by user-scope.ts does.
 */

/** Sealed column of a "life" module table: "life:<table>.<column>". */
export type SealedField = `life:${string}.${string}`;

export interface SealCodec {
  seal(field: SealedField, value: unknown): string;
  open<T>(field: SealedField, payload: string): T;
}

export interface UserDataScope {
  userId: string;
  codec: SealCodec;
}

export const userDataScope = new AsyncLocalStorage<UserDataScope>();

export function currentUserDataScope(): UserDataScope {
  const current = userDataScope.getStore();
  if (!current) {
    throw new Error("Encrypted column accessed outside withUserData()");
  }
  return current;
}

/**
 * Column holding an encrypted JSON value of type T. `field` names the column
 * in the associated data, so a value copied to another column fails to decrypt.
 */
export function sealed<T>(field: SealedField) {
  return customType<{ data: T; driverData: string }>({
    dataType() {
      return "text";
    },
    toDriver(value: T): string {
      return currentUserDataScope().codec.seal(field, value);
    },
    fromDriver(value: string): T {
      return currentUserDataScope().codec.open<T>(field, value);
    },
  })();
}
