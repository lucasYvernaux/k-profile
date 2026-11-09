import { healthConfigSchema, saveBodyMetricSchema } from "@/features/health/health.schemas";
import {
  deleteBodyMetric,
  listBodyMetrics,
  saveBodyMetric,
  updateHealthConfig,
} from "@/features/health/server/health.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listBodyMetrics());

/** Saves (or replaces) the measurements of a date. */
export const POST = route({ body: saveBodyMetricSchema }, async ({ body }) => {
  await saveBodyMetric(body);
});

/** Settings: weekly goal, target weight, sex. */
export const PATCH = route({ body: healthConfigSchema }, ({ body }) => updateHealthConfig(body));

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteBodyMetric(query.id);
});
