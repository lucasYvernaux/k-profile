import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Evening reminder (cron every 10 min): sent once a day, only once the user's chosen time has
 * passed in their time zone, and dead subscriptions (410 Gone) are removed.
 */
type Row = { subscription: Record<string, unknown>; timeZone: string };
let rows: Row[] = [];
const sent: string[] = [];
const updates: unknown[] = [];
const deletes: unknown[] = [];
let pushError: { statusCode: number } | null = null;

vi.mock("web-push", () => ({
  setVapidDetails: () => undefined,
  // A plain function, not vi.fn(): Vitest reports errors thrown by a vi.fn() even when caught.
  sendNotification: async (subscription: { endpoint: string }) => {
    if (pushError) throw pushError;
    sent.push(subscription.endpoint);
  },
}));
vi.mock("@/server/env", () => ({
  env: () => ({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:a@b.c" }),
}));
vi.mock("@/server/crypto/user-data", () => ({
  userCipher: async () => ({ open: () => ({ p256dh: "k", auth: "a" }) }),
}));
vi.mock("@/server/db/client", () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ innerJoin: () => ({ where: async () => rows }) }) }),
    update: () => ({ set: (values: unknown) => ({ where: async () => updates.push(values) }) }),
    delete: () => ({ where: async (condition: unknown) => deletes.push(condition) }),
  }),
}));

const { sendDueReminders } = await import("@/server/data/push");

const subscription = (overrides: Record<string, unknown> = {}): Row => ({
  subscription: { id: 1, userId: "u1", endpoint: "https://push/1", keysEnc: "x", reminderTime: "21:00", lastSentOn: null, ...overrides },
  timeZone: "Europe/Paris",
});

describe("sendDueReminders", () => {
  beforeEach(() => {
    rows = [];
    sent.length = 0;
    updates.length = 0;
    deletes.length = 0;
    pushError = null;
  });

  it("sends once the reminder time has passed in the user's time zone, and records the day", async () => {
    rows = [subscription()];
    // 20:30 UTC = 21:30 in Paris (UTC+1 in November).
    expect(await sendDueReminders(new Date("2026-11-10T20:30:00Z"))).toEqual({ sent: 1, removed: 0 });
    expect(sent).toEqual(["https://push/1"]);
    expect(updates).toEqual([{ lastSentOn: "2026-11-10" }]);
  });

  it("waits until the reminder time", async () => {
    rows = [subscription()];
    // 19:30 UTC = 20:30 in Paris.
    expect(await sendDueReminders(new Date("2026-11-10T19:30:00Z"))).toEqual({ sent: 0, removed: 0 });
  });

  it("does not send twice the same day", async () => {
    rows = [subscription({ lastSentOn: "2026-11-10" })];
    expect(await sendDueReminders(new Date("2026-11-10T21:30:00Z"))).toEqual({ sent: 0, removed: 0 });
  });

  it("removes a subscription the push service no longer knows", async () => {
    rows = [subscription()];
    pushError = { statusCode: 410 };
    expect(await sendDueReminders(new Date("2026-11-10T20:30:00Z"))).toEqual({ sent: 0, removed: 1 });
    expect(deletes).toHaveLength(1);
  });
});
