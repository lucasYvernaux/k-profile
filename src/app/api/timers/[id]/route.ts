import { updateTimerSchema } from "@/features/timers/timers.schemas";
import { deleteTimer, updateTimer } from "@/features/timers/server/timers.service";
import { route } from "@/server/http/route";
import { idParams } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = route({ params: idParams, body: updateTimerSchema }, async ({ params, body }) => {
  await updateTimer(params.id, body);
});

export const DELETE = route({ params: idParams }, async ({ params }) => {
  await deleteTimer(params.id);
});
