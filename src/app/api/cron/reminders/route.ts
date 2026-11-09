import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/server/data/push";
import { env } from "@/server/env";
import { jsonError } from "@/server/http/guards";

/** Called every few minutes by an external scheduler with "Authorization: Bearer <CRON_SECRET>". */
function authorized(request: Request): boolean {
  const secret = env().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return jsonError(401, "Non autorisé.");
  }
  return Response.json(await sendDueReminders());
}
