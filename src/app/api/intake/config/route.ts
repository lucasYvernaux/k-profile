import { intakeConfigSchema } from "@/features/intake/intake.schemas";
import { readConfig, resetConfig, writeConfig } from "@/features/intake/server/intake-config";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({}, () => readConfig());

export const POST = route({ body: intakeConfigSchema }, ({ body }) => writeConfig(body));

/** Restores factory settings. */
export const DELETE = route({}, () => resetConfig());
