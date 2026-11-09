import "server-only";
import { and, eq } from "drizzle-orm";
import { sendNotification, setVapidDetails } from "web-push";
import { toDayKey } from "@/domain/dates";
import { userCipher } from "../crypto/user-data";
import { db } from "../db/client";
import { pushSubscription, userProfile } from "../db/schema";
import { env } from "../env";

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  keys: PushKeys,
  reminderTime: string,
): Promise<void> {
  const cipher = await userCipher(userId);
  const keysEnc = cipher.seal("push_subscription.keys", keys);
  await db
    .insert(pushSubscription)
    .values({ userId, endpoint, keysEnc, reminderTime })
    .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { userId, keysEnc, reminderTime, enabled: true } });
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}

function vapidReady(): boolean {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env();
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return false;
  }
  setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

/** The notification text is generic on purpose: it can show on a locked screen. */
const REMINDER = JSON.stringify({
  title: "K",
  body: "Journal du soir : 5 minutes pour nommer 3 émotions.",
  url: "/journal",
});

/** Sends the evening reminder to every subscription whose time has come today. */
export async function sendDueReminders(now = new Date()): Promise<{ sent: number; removed: number }> {
  if (!vapidReady()) {
    return { sent: 0, removed: 0 };
  }
  const rows = await db
    .select({ subscription: pushSubscription, timeZone: userProfile.timeZone })
    .from(pushSubscription)
    .innerJoin(userProfile, eq(userProfile.userId, pushSubscription.userId))
    .where(eq(pushSubscription.enabled, true));

  let sent = 0;
  let removed = 0;
  for (const { subscription, timeZone } of rows) {
    const today = toDayKey(now, timeZone);
    const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(now);
    if (subscription.lastSentOn === today || time < subscription.reminderTime) {
      continue;
    }
    const cipher = await userCipher(subscription.userId);
    const keys = cipher.open<PushKeys>("push_subscription.keys", subscription.keysEnc);
    try {
      await sendNotification({ endpoint: subscription.endpoint, keys }, REMINDER, { TTL: 3600 });
      await db.update(pushSubscription).set({ lastSentOn: today }).where(eq(pushSubscription.id, subscription.id));
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscription).where(eq(pushSubscription.id, subscription.id));
        removed += 1;
      }
    }
  }
  return { sent, removed };
}
