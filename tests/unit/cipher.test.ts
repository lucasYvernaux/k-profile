import { describe, expect, it } from "vitest";
import { decrypt, DecryptionError, encrypt, generateKey } from "@/server/crypto/cipher";

describe("AES-256-GCM cipher", () => {
  const key = generateKey();

  it("round-trips a value", () => {
    const sealed = encrypt("colère, fierté, calme", key, "journal:u1");
    expect(decrypt(sealed, key, "journal:u1").toString("utf8")).toBe("colère, fierté, calme");
  });

  it("never produces the same ciphertext twice", () => {
    expect(encrypt("same", key, "ctx")).not.toBe(encrypt("same", key, "ctx"));
  });

  it("refuses a ciphertext moved to another user or field", () => {
    const sealed = encrypt("secret", key, "journal:u1");
    expect(() => decrypt(sealed, key, "journal:u2")).toThrow(DecryptionError);
  });

  it("refuses a tampered ciphertext", () => {
    const sealed = encrypt("secret", key, "ctx");
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(parts.join("."), key, "ctx")).toThrow(DecryptionError);
  });

  it("refuses a wrong key", () => {
    const sealed = encrypt("secret", key, "ctx");
    expect(() => decrypt(sealed, generateKey(), "ctx")).toThrow(DecryptionError);
  });
});
