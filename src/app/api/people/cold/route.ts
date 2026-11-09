import { coldSchema } from "@/features/network/network.schemas";
import { setCold } from "@/features/network/server/network.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

/** Marks a relationship as "en froid" (optional reason) or ends it. */
export const POST = route({ body: coldSchema }, ({ body }) => setCold(body));
