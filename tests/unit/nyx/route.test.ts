import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const apiUser = vi.fn();
vi.mock("@/server/http/guards", () => ({ apiUser: () => apiUser() }));
const withUserData = vi.fn((_userId: string, task: () => Promise<unknown>) => task());
vi.mock("@/server/crypto/user-scope", () => ({
  withUserData: (userId: string, task: () => Promise<unknown>) => withUserData(userId, task),
}));

const { route } = await import("@/server/http/route");

const context = { params: Promise.resolve({}) };

function post(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://k.example/api/test", {
    method: "POST",
    body,
    headers: { host: "k.example", origin: "https://k.example", "content-type": "application/json", ...headers },
  });
}

const handler = route({ body: z.object({ name: z.string().max(5) }) }, ({ body, userId }) => ({
  hello: body.name,
  userId,
}));

describe("route() wrapper", () => {
  beforeEach(() => {
    apiUser.mockReset();
    apiUser.mockResolvedValue({ id: "user-1" });
    withUserData.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("returns the handler result as non-cacheable JSON, inside the user's data scope", async () => {
    const response = await handler(post('{"name":"Ana"}'), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ hello: "Ana", userId: "user-1" });
    expect(withUserData).toHaveBeenCalledWith("user-1", expect.any(Function));
  });

  it("rejects requests without a signed-in user with TOTP (401)", async () => {
    apiUser.mockResolvedValue(null);
    expect((await handler(post('{"name":"Ana"}'), context)).status).toBe(401);
    expect(withUserData).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before checking the session", async () => {
    const response = await handler(post('{"name":"Ana"}', { origin: "https://evil.example" }), context);
    expect(response.status).toBe(403);
    expect(apiUser).not.toHaveBeenCalled();
  });

  it("reports validation issues without echoing input", async () => {
    const response = await handler(post('{"name":"far too long"}'), context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.issues[0].path).toBe("name");
    expect(JSON.stringify(body)).not.toContain("far too long");
  });

  it("requires a JSON content type and enforces the size limit", async () => {
    expect((await handler(post("name=Ana", { "content-type": "text/plain" }), context)).status).toBe(415);
    expect((await handler(post(JSON.stringify({ name: "x".repeat(70_000) })), context)).status).toBe(413);
    expect((await handler(post("{not json"), context)).status).toBe(400);
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const failing = route({}, () => {
      throw new Error("connection string postgres://secret");
    });
    const response = await failing(
      new NextRequest("https://k.example/api/test", { headers: { host: "k.example" } }),
      context,
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
});
