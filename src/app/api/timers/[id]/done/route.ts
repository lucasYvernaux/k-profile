import { completeTimerSchema } from "@/features/timers/timers.schemas";
import { completeTimer } from "@/features/timers/server/timers.service";
import { route } from "@/server/http/route";
import { idParams } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route({ params: idParams, body: completeTimerSchema }, async ({ params, body }) => {
  await completeTimer(params.id, body);
});
