import { syncRequestSchema } from "@/domain/sync";
import { addJournalEntry, saveHealth, savePriorities } from "@/server/data/entries";
import { setCheckIn } from "@/server/data/habits";
import { apiUser, isSameOrigin, jsonError } from "@/server/http/guards";

const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "Origine refusée.");
  }
  const user = await apiUser(request);
  if (!user) {
    return jsonError(401, "Session requise.");
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonError(413, "Requête trop volumineuse.");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(400, "JSON invalide.");
  }
  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Données invalides.");
  }

  for (const item of parsed.data.items) {
    switch (item.kind) {
      case "check-in":
        try {
          await setCheckIn(user.id, item.habitId, item.day, item.done);
        } catch (error) {
          // Only a habit deleted since the item was queued is skipped; any other failure must
          // fail the request so the device keeps its queue.
          if (!(error instanceof RangeError)) throw error;
        }
        break;
      case "journal":
        await addJournalEntry(user.id, item, item.clientId);
        break;
      case "health":
        await saveHealth(user.id, item);
        break;
      case "priorities":
        await savePriorities(user.id, item.day, item.priorities);
        break;
    }
  }
  return Response.json({ applied: parsed.data.items.length });
}
