import { updateWorkoutSchema, workoutSchema } from "@/features/health/health.schemas";
import { createWorkout, deleteWorkout, listWorkouts, updateWorkout } from "@/features/health/server/health.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listWorkouts());

export const POST = route({ body: workoutSchema }, ({ body }) => createWorkout(body));

export const PUT = route({ body: updateWorkoutSchema }, async ({ body: { id, ...input } }) => {
  await updateWorkout(id, input);
});

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteWorkout(query.id);
});
