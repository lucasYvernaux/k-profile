import { phaseEntriesQuerySchema, recordPhaseSchema } from "@/features/routine/routine.schemas";
import { listPhaseEntries, recordPhase } from "@/features/routine/server/routine.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({ query: phaseEntriesQuerySchema }, ({ query }) => listPhaseEntries(query.date));

export const POST = route({ body: recordPhaseSchema }, async ({ body }) => {
  await recordPhase(body);
});
