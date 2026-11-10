import { describe, expect, it } from "vitest";
import { DrizzleQueryError } from "drizzle-orm";
import { describeError } from "@/server/log";

describe("describeError (no personal data in logs)", () => {
  it("never logs the parameters of a failed query", () => {
    const cause = Object.assign(new Error('invalid input syntax for type integer: "mon secret"'), { code: "22P02" });
    const error = new DrizzleQueryError("insert into journal_entries (text) values ($1)", ["Note très personnelle"], cause);

    const fields = describeError(error);
    const logged = JSON.stringify(fields);

    expect(logged).not.toContain("Note très personnelle");
    expect(logged).not.toContain("mon secret");
    expect(fields.errorMessage).toBeUndefined();
    expect(fields.dbErrorCode).toBe("22P02");
    expect(fields.query).toBe("insert into journal_entries (text) values ($1)");
  });

  it("drops the message of a raw PostgreSQL error", () => {
    const error = Object.assign(new Error('duplicate key value: "Alice"'), { code: "23505" });
    expect(JSON.stringify(describeError(error))).not.toContain("Alice");
  });

  it("keeps the full description of an ordinary error", () => {
    const fields = describeError(new TypeError("boom"));
    expect(fields).toMatchObject({ errorName: "TypeError", errorMessage: "boom" });
    expect(fields.stack).toContain("boom");
  });
});
