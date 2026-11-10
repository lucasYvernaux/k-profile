import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * /api/sync replays check-ins queued offline. When the response is OK the device empties its
 * queue, so a failed write must never be answered with OK.
 */
// A plain function, not vi.fn(): Vitest reports errors thrown by a vi.fn() even when caught.
let checkInError: Error | null = null;
vi.mock("@/server/data/habits", () => ({
  setCheckIn: async () => {
    if (checkInError) throw checkInError;
  },
}));
vi.mock("@/server/data/entries", () => ({ addJournalEntry: vi.fn(), saveHealth: vi.fn(), savePriorities: vi.fn() }));
vi.mock("@/server/http/guards", () => ({
  isSameOrigin: () => true,
  apiUser: async () => ({ id: "user-1" }),
  jsonError: (status: number, message: string) => Response.json({ error: message }, { status }),
}));

const { POST } = await import("@/app/api/sync/route");

const checkIn = () =>
  new Request("https://k.example/api/sync", {
    method: "POST",
    body: JSON.stringify({ items: [{ kind: "check-in", habitId: crypto.randomUUID(), day: "2026-11-10", done: true }] }),
  });

describe("/api/sync check-ins", () => {
  beforeEach(() => {
    checkInError = null;
  });

  it("skips a check-in whose habit was deleted since it was queued", async () => {
    checkInError = new RangeError("Habitude introuvable.");
    expect((await POST(checkIn())).status).toBe(200);
  });

  it("does not answer OK when the database write fails, so the device keeps its queue", async () => {
    checkInError = new Error("connection terminated");
    await expect(POST(checkIn())).rejects.toThrow("connection terminated");
  });
});
