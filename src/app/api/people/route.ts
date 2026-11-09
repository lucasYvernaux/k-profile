import { createPersonSchema, updatePersonSchema } from "@/features/network/network.schemas";
import { createPerson, deletePerson, getNetwork, updatePerson } from "@/features/network/server/network.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route({}, () => getNetwork());

export const POST = route({ body: createPersonSchema }, ({ body }) => createPerson(body));

export const PUT = route({ body: updatePersonSchema }, ({ body: { id, ...input } }) => updatePerson(id, input));

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deletePerson(query.id);
});
