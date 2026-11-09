"use server";

import { refresh } from "next/cache";
import { scheduleSchema } from "@/domain/schedule";
import type { FormState } from "@/lib/form-state";
import { requireAppContext, updateSchedule } from "@/server/data/profile";

export async function saveScheduleAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireAppContext();
  const starts = form.getAll("start").map(String);
  const ends = form.getAll("end").map(String);
  const labels = form.getAll("label").map(String);
  const parsed = scheduleSchema.safeParse(
    starts.map((start, index) => ({ start, end: ends[index] ?? "", label: labels[index] ?? "" })),
  );
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = typeof issue.path[0] === "number" ? ` (ligne ${issue.path[0] + 1})` : "";
    return { status: "error", message: `${issue.message}${row}` };
  }
  await updateSchedule(user.id, parsed.data);
  refresh();
  return { status: "success", message: "Journée type enregistrée." };
}
