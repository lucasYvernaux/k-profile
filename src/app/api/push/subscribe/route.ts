import { z } from "zod";
import { deletePushSubscription, savePushSubscription } from "@/server/data/push";
import { apiUser, isSameOrigin, jsonError } from "@/server/http/guards";

const subscribeSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const unsubscribeSchema = z.object({ endpoint: z.url().max(2048) });

async function guard(request: Request) {
  if (!isSameOrigin(request)) {
    return { error: jsonError(403, "Origine refusée.") } as const;
  }
  const user = await apiUser(request);
  return user ? ({ user } as const) : ({ error: jsonError(401, "Session requise.") } as const);
}

export async function POST(request: Request) {
  const result = await guard(request);
  if ("error" in result) {
    return result.error;
  }
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Abonnement invalide.");
  }
  const { endpoint, keys, reminderTime } = parsed.data;
  await savePushSubscription(result.user.id, endpoint, keys, reminderTime);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const result = await guard(request);
  if ("error" in result) {
    return result.error;
  }
  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Requête invalide.");
  }
  await deletePushSubscription(result.user.id, parsed.data.endpoint);
  return Response.json({ ok: true });
}
