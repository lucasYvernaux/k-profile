import { linkSchema } from "@/features/network/network.schemas";
import { deleteLink, upsertLink } from "@/features/network/server/network.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

/** Creates or updates the link between two people (one link per pair). */
export const POST = route({ body: linkSchema }, ({ body }) => upsertLink(body));

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteLink(query.id);
});
