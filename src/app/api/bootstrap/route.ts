import { ensureSeeded } from "@/features/progress/server/seed";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

/** Idempotent: seeds default habits, routines, timers, quotes and badges on an empty database. */
export const POST = route({}, async () => {
  await ensureSeeded();
});
