import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM authenticated encryption (Node.js crypto).
 * Format: "v1.<iv>.<tag>.<ciphertext>", each part base64url.
 * The associated data binds a ciphertext to its owner and column, so a
 * value copied to another row or user fails to decrypt.
 */
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const VERSION = "v1";

export class DecryptionError extends Error {
  constructor() {
    super("Unable to decrypt value");
    this.name = "DecryptionError";
  }
}

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new RangeError("Encryption key must be 32 bytes");
  }
}

export function generateKey(): Buffer {
  return randomBytes(KEY_BYTES);
}

export function encrypt(plaintext: string | Buffer, key: Buffer, associatedData: string): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext].map((part) =>
    typeof part === "string" ? part : part.toString("base64url"),
  ).join(".");
}

export function decrypt(payload: string, key: Buffer, associatedData: string): Buffer {
  assertKey(key);
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new DecryptionError();
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(associatedData, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
  } catch {
    throw new DecryptionError();
  }
}
