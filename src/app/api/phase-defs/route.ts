import { createPhaseSchema } from "@/features/routine/routine.schemas";
import { createPhaseDef, listPhaseDefs, resetPhaseDefs } from "@/features/routine/server/routine.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listPhaseDefs());

export const POST = route({ body: createPhaseSchema }, ({ body }) => createPhaseDef(body));

/** Resets the routines (weekdays + Sunday) to the manifesto defaults. */
export const PUT = route({}, () => resetPhaseDefs());
