"use server";

import { refresh } from "next/cache";
import { PILLAR_IDS } from "@/domain/pillars";
import { quarterlyReviewSchema } from "@/domain/review";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { requireAppContext } from "@/server/data/profile";
import { saveReview } from "@/server/data/progress";

export async function saveReviewAction(_previous: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireAppContext();
  const parsed = quarterlyReviewSchema.safeParse({
    quarter: form.get("quarter"),
    scores: Object.fromEntries(PILLAR_IDS.map((pillar) => [pillar, form.get(`score.${pillar}`)])),
    wins: form.get("wins") ?? "",
    obstacles: form.get("obstacles") ?? "",
    nextFocus: form.get("nextFocus") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Donne une note de 1 à 10 à chaque pilier.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  await saveReview(user.id, parsed.data);
  refresh();
  return { status: "success", message: `Revue ${parsed.data.quarter} enregistrée.` };
}
