import { z } from "zod";

/** Editable typical day (brief, MVP item 3). */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleBlockSchema = z
  .object({
    start: z.string().regex(TIME, { message: "Heure au format HH:MM." }),
    end: z
      .string()
      .regex(TIME, { message: "Heure au format HH:MM." })
      .or(z.literal(""))
      .transform((value) => value || null)
      .nullable(),
    label: z.string().trim().min(1, { message: "Libellé requis." }).max(80),
  })
  .refine((block) => block.end === null || block.end > block.start, {
    message: "La fin doit être après le début.",
    path: ["end"],
  });

export const scheduleSchema = z.array(scheduleBlockSchema).max(30);

export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;

export const DEFAULT_SCHEDULE: ScheduleBlock[] = [
  { start: "06:30", end: null, label: "Lever" },
  { start: "06:45", end: null, label: "Sport" },
  { start: "08:00", end: null, label: "Planification" },
  { start: "08:30", end: "12:30", label: "Travail profond" },
  { start: "12:30", end: null, label: "Déjeuner et échecs" },
  { start: "14:00", end: "17:30", label: "Clients" },
  { start: "17:30", end: null, label: "Lecture" },
  { start: "19:00", end: null, label: "Combat ou atelier" },
  { start: "21:30", end: null, label: "Journal" },
  { start: "22:30", end: null, label: "Coucher" },
];

export function sortSchedule(blocks: readonly ScheduleBlock[]): ScheduleBlock[] {
  return [...blocks].sort((a, b) => a.start.localeCompare(b.start));
}

/** Index of the block in progress at `time` (HH:MM), or -1. */
export function currentBlockIndex(blocks: readonly ScheduleBlock[], time: string): number {
  const sorted = sortSchedule(blocks);
  let index = -1;
  sorted.forEach((block, position) => {
    if (block.start <= time) {
      index = position;
    }
  });
  return index;
}

export const MAX_DAILY_PRIORITIES = 3;

export const dailyPrioritiesSchema = z
  .array(z.string().trim().max(140))
  .max(MAX_DAILY_PRIORITIES)
  .transform((items) => items.filter(Boolean));
