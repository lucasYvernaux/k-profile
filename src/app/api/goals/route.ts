import { createGoalSchema } from "@/features/goals/goals.schemas";
import { createGoal, listGoals } from "@/features/goals/server/goals.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listGoals());

export const POST = route({ body: createGoalSchema }, ({ body }) => createGoal(body));
