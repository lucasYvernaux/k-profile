import { createSkillSchema, updateSkillSchema } from "@/features/goals/goals.schemas";
import { createSkill, deleteSkill, listSkills, updateSkill } from "@/features/goals/server/goals.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listSkills());

export const POST = route({ body: createSkillSchema }, ({ body }) => createSkill(body));

export const PATCH = route({ body: updateSkillSchema }, async ({ body }) => {
  await updateSkill(body);
});

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteSkill(query.id);
});
