"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { HabitLimitError } from "@/domain/habits";
import { isPillarId } from "@/domain/pillars";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import {
  activateHabit,
  addHabit,
  deleteHabit,
  moveHabit,
  setHabitStatus,
} from "@/server/data/habits";
import { requireAppContext } from "@/server/data/profile";

const habitIdSchema = z.uuid();

function habitIdFrom(form: FormData): string {
  return habitIdSchema.parse(form.get("habitId"));
}

export async function activateHabitAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { user, today } = await requireAppContext();
  try {
    await activateHabit(user.id, habitIdFrom(form), today);
  } catch (error) {
    if (error instanceof HabitLimitError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  refresh();
  return { status: "success", message: "Habitude débloquée." };
}

export async function pauseHabitAction(form: FormData): Promise<void> {
  const { user } = await requireAppContext();
  await setHabitStatus(user.id, habitIdFrom(form), "paused");
  refresh();
}

export async function requeueHabitAction(form: FormData): Promise<void> {
  const { user } = await requireAppContext();
  await setHabitStatus(user.id, habitIdFrom(form), "locked");
  refresh();
}

export async function moveHabitAction(form: FormData): Promise<void> {
  const { user } = await requireAppContext();
  const direction = form.get("direction") === "up" ? -1 : 1;
  await moveHabit(user.id, habitIdFrom(form), direction);
  refresh();
}

export async function deleteHabitAction(form: FormData): Promise<void> {
  const { user } = await requireAppContext();
  await deleteHabit(user.id, habitIdFrom(form));
  refresh();
}

const newHabitSchema = z
  .object({
    title: z.string().trim().min(2, { message: "Au moins 2 caractères." }).max(80),
    pillar: z.string().refine(isPillarId, { message: "Pilier invalide." }),
    cadence: z.enum(["daily", "weekly"]),
    timesPerWeek: z.coerce.number().int().min(1).max(7).nullable(),
  })
  .transform((value) => ({ ...value, pillar: value.pillar as Parameters<typeof addHabit>[1]["pillar"] }));

export async function addHabitAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireAppContext();
  const cadence = form.get("cadence");
  const parsed = newHabitSchema.safeParse({
    title: form.get("title"),
    pillar: form.get("pillar"),
    cadence,
    timesPerWeek: cadence === "weekly" ? form.get("timesPerWeek") : null,
  });
  if (!parsed.success) {
    return { status: "error", message: "Habitude invalide.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  await addHabit(user.id, parsed.data);
  refresh();
  return { status: "success", message: "Habitude ajoutée en fin de file." };
}
