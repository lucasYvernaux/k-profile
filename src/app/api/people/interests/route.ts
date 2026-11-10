import { updateInterestSchema } from "@/features/network/network.schemas";
import { deleteInterest, updateInterest } from "@/features/network/server/interests.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

/** Renames or recolours a domain; renaming it like another domain merges both. */
export const PUT = route({ body: updateInterestSchema }, ({ body }) => updateInterest(body));

/** Removes a domain from everyone. */
export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteInterest(query.id);
});
