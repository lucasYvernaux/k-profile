import { interactionSchema } from "@/features/network/network.schemas";
import { deleteInteraction, logInteraction } from "@/features/network/server/network.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route({ body: interactionSchema }, ({ body }) => logInteraction(body));

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteInteraction(query.id);
});
