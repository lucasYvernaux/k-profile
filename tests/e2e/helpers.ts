import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  let bits = "";
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    const value = BASE32.indexOf(char);
    if (value === -1) throw new Error("Invalid base32 secret");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((byte) => parseInt(byte, 2)));
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s), used to pass the second factor in tests. */
export function totp(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/**
 * Fails on any WCAG 2.0/2.1/2.2 A or AA violation reported by axe-core,
 * in both light and dark colour schemes. Set SCREENSHOT_DIR to also save
 * a screenshot of each checked page.
 */
export async function expectAccessible(page: Page) {
  // Let pending router refreshes finish: the <title> is briefly empty during them.
  await expect(page).toHaveTitle(/.+/);
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.mouse.move(0, 0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = results.violations.map(
      (violation) => `${colorScheme} ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    );
    expect(summary, "accessibility violations").toEqual([]);
    if (process.env.SCREENSHOT_DIR) {
      const name = new URL(page.url()).pathname.replaceAll("/", "_") || "_root";
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}-${colorScheme}.png`, fullPage: true });
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
}
