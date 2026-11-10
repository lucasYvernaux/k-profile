import { z } from "zod";
import { isGamificationEnabled, setGamificationEnabled } from "@/features/settings/server/gamification";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

const gamificationSchema = z.object({ enabled: z.boolean() });

export const GET = route({}, async () => ({ enabled: await isGamificationEnabled() }));

export const PUT = route({ body: gamificationSchema, maxBodyBytes: 1024 }, async ({ body }) => {
  await setGamificationEnabled(body.enabled);
  return { enabled: body.enabled };
});
