import { createEmotionSchema, emotionIdQuerySchema } from "@/features/journal/journal.schemas";
import { createEmotion, deleteEmotion, listEmotions } from "@/features/journal/server/journal.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listEmotions());

export const POST = route({ body: createEmotionSchema }, ({ body }) => createEmotion(body));

export const DELETE = route({ query: emotionIdQuerySchema }, async ({ query }) => {
  await deleteEmotion(query.id);
  return { ok: true, id: query.id };
});
