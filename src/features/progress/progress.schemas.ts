import { z } from "zod";
import { dateKey } from "@/shared/lib/validation";

export const playerQuerySchema = z.object({ from: dateKey.optional(), to: dateKey.optional() });
