import { createProjectSchema } from "@/features/goals/goals.schemas";
import { createProject, listProjects } from "@/features/goals/server/goals.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listProjects());

export const POST = route({ body: createProjectSchema }, ({ body }) => createProject(body));
