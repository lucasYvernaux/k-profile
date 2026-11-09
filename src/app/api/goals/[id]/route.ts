import { updateGoalSchema } from "@/features/goals/goals.schemas";
import { deleteGoal, updateGoal } from "@/features/goals/server/goals.service";
import { route } from "@/server/http/route";
import { idParams } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = route({ params: idParams, body: updateGoalSchema }, async ({ params, body }) => {
  await updateGoal(params.id, body);
});

export const DELETE = route({ params: idParams }, async ({ params }) => {
  await deleteGoal(params.id);
});
