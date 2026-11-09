import { updatePhaseSchema } from "@/features/routine/routine.schemas";
import { deletePhaseDef, updatePhaseDef } from "@/features/routine/server/routine.service";
import { route } from "@/server/http/route";
import { idParams } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = route({ params: idParams, body: updatePhaseSchema }, async ({ params, body }) => {
  await updatePhaseDef(params.id, body);
});

export const DELETE = route({ params: idParams }, async ({ params }) => {
  await deletePhaseDef(params.id);
});
