"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { setMilestoneDone } from "@/server/data/progress";
import { requireAppContext } from "@/server/data/profile";

export async function toggleMilestoneAction(form: FormData): Promise<void> {
  const { user, today } = await requireAppContext();
  const milestoneId = z.uuid().parse(form.get("milestoneId"));
  const done = form.get("done") === "true";
  await setMilestoneDone(user.id, milestoneId, done ? today : null);
  refresh();
}
