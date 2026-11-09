import { updateProjectSchema } from "@/features/goals/goals.schemas";
import { deleteProject, updateProject } from "@/features/goals/server/goals.service";
import { route } from "@/server/http/route";
import { idParams } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

/** Project journals can grow: larger body limit than the default 64 KiB. */
export const PATCH = route(
  { params: idParams, body: updateProjectSchema, maxBodyBytes: 512 * 1024 },
  async ({ params, body }) => {
    await updateProject(params.id, body);
  }
);

export const DELETE = route({ params: idParams }, async ({ params }) => {
  await deleteProject(params.id);
});
