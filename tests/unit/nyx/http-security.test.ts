import { describe, expect, it } from "vitest";
import { HttpError } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/origin";

function request(method: string, headers: Record<string, string>) {
  return new Request("https://k.example/api/timers", { method, headers: { host: "k.example", ...headers } });
}

function forbiddenCode(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof HttpError && error.status === 403 ? error.code : "unexpected";
  }
}

describe("assertSameOrigin (CSRF)", () => {
  it("lets safe methods through", () => {
    expect(forbiddenCode(() => assertSameOrigin(request("GET", { origin: "https://evil.example" })))).toBeNull();
  });

  it("accepts a same-origin mutation", () => {
    const req = request("POST", { origin: "https://k.example", "sec-fetch-site": "same-origin" });
    expect(forbiddenCode(() => assertSameOrigin(req))).toBeNull();
  });

  it("rejects a cross-site mutation", () => {
    const req = request("POST", { origin: "https://evil.example", "sec-fetch-site": "cross-site" });
    expect(forbiddenCode(() => assertSameOrigin(req))).toBe("cross_site_request");
  });

  it("rejects a foreign Origin even without Fetch Metadata", () => {
    expect(forbiddenCode(() => assertSameOrigin(request("DELETE", { origin: "https://evil.example" })))).toBe("origin_mismatch");
  });

  it("rejects a mutation with no origin information", () => {
    expect(forbiddenCode(() => assertSameOrigin(request("POST", {})))).toBe("missing_origin");
  });
});
