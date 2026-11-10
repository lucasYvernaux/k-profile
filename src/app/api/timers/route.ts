import { createTimerSchema } from "@/features/timers/timers.schemas";
import { createTimer, listTimers } from "@/features/timers/server/timers.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listTimers());

export const POST = route({ body: createTimerSchema }, ({ body }) => createTimer(body));
