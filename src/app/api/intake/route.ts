import { createIntakeSchema, intakeIdQuerySchema, intakeQuerySchema } from "@/features/intake/intake.schemas";
import { addIntake, deleteIntake, getIntakeDay } from "@/features/intake/server/intake.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({ query: intakeQuerySchema }, ({ query }) => getIntakeDay(query));

export const POST = route({ body: createIntakeSchema }, ({ body }) => addIntake(body));

export const DELETE = route({ query: intakeIdQuerySchema }, async ({ query }) => {
  await deleteIntake(query.id);
});
