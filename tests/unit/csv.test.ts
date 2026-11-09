import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes values and escapes double quotes", () => {
    expect(toCsv([{ day: "2026-11-09", note: 'il a dit "non"' }])).toBe(
      '"day","note"\r\n"2026-11-09","il a dit ""non"""\r\n',
    );
  });

  it("neutralises formula injection", () => {
    expect(toCsv([{ value: "=HYPERLINK(\"x\")" }])).toContain(`"'=HYPERLINK`);
  });
});
