import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateKey } from "@/server/crypto/cipher";
import { userDataScope, type SealCodec, type SealedField } from "@/server/crypto/sealed-columns";
import { bodyMetrics, people } from "@/server/db/life-schema";

/** Same construction as userCipher() (src/server/crypto/user-data.ts), without the database. */
function codecFor(userId: string, key = generateKey()): SealCodec {
  const context = (field: SealedField) => `${field}:${userId}`;
  return {
    seal: (field, value) => encrypt(JSON.stringify(value), key, context(field)),
    open: <T>(field: SealedField, payload: string) =>
      JSON.parse(decrypt(payload, key, context(field)).toString("utf8")) as T,
  };
}

describe("sealed columns (ADR 0010)", () => {
  it("encrypts on write and decrypts on read inside the user's scope", () => {
    const codec = codecFor("user-1");
    userDataScope.run({ userId: "user-1", codec }, () => {
      const stored = String(bodyMetrics.weightKg.mapToDriverValue(72.5));
      expect(stored).not.toContain("72.5");
      expect(stored.startsWith("v1.")).toBe(true);
      expect(bodyMetrics.weightKg.mapFromDriverValue(stored)).toBe(72.5);
    });
  });

  it("fails closed outside a user scope", () => {
    expect(() => people.firstName.mapToDriverValue("Ana")).toThrow(/outside withUserData/);
  });

  it("refuses a value read by another user, even with the same key", () => {
    const key = generateKey();
    const stored = userDataScope.run({ userId: "user-1", codec: codecFor("user-1", key) }, () =>
      String(people.firstName.mapToDriverValue("Ana")),
    );
    userDataScope.run({ userId: "user-2", codec: codecFor("user-2", key) }, () => {
      expect(() => people.firstName.mapFromDriverValue(stored)).toThrow();
    });
  });

  it("refuses a value copied to another column", () => {
    const codec = codecFor("user-1");
    userDataScope.run({ userId: "user-1", codec }, () => {
      const stored = String(people.notes.mapToDriverValue("secret"));
      expect(() => people.firstName.mapFromDriverValue(stored)).toThrow();
    });
  });
});
