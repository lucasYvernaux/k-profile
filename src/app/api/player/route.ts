import { playerQuerySchema } from "@/features/progress/progress.schemas";
import { getPlayerProfile } from "@/features/progress/server/player.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

export const GET = route({ query: playerQuerySchema }, ({ query }) => getPlayerProfile(query));
