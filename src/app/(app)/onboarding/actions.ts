"use server";

import { redirect } from "next/navigation";
import { auditSchema } from "@/domain/audit";
import { toDayKey } from "@/domain/dates";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { ensureProfile } from "@/server/data/profile";
import { saveBaselineAudit } from "@/server/data/progress";
import { requireUser } from "@/server/session";

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

async function auditFromForm(form: FormData) {
  return auditSchema.safeParse({
    bigFive: {
      takenOn: text(form, "bigFive.takenOn"),
      instrument: text(form, "bigFive.instrument"),
      openness: text(form, "bigFive.openness"),
      conscientiousness: text(form, "bigFive.conscientiousness"),
      extraversion: text(form, "bigFive.extraversion"),
      agreeableness: text(form, "bigFive.agreeableness"),
      neuroticism: text(form, "bigFive.neuroticism"),
    },
    body: {
      weightKg: text(form, "body.weightKg"),
      waistCm: text(form, "body.waistCm"),
      restingHeartRate: text(form, "body.restingHeartRate"),
      pushUps: text(form, "body.pushUps"),
      wakeTime: text(form, "body.wakeTime"),
      bedTime: text(form, "body.bedTime"),
    },
    business: {
      revenueLast12Months: text(form, "business.revenueLast12Months"),
      dailyRate: text(form, "business.dailyRate"),
      biggestClientShare: text(form, "business.biggestClientShare"),
      workHoursPerWeek: text(form, "business.workHoursPerWeek"),
    },
    money: {
      savings: text(form, "money.savings"),
      monthlyExpenses: text(form, "money.monthlyExpenses"),
    },
    relationships: {
      closeCircle: form
        .getAll("relationships.closeCircle")
        .map((value) => String(value).trim())
        .filter(Boolean),
    },
    habits: {
      drinksPerWeek: text(form, "habits.drinksPerWeek"),
      screenHoursPerDay: text(form, "habits.screenHoursPerDay"),
    },
    notes: text(form, "notes"),
  });
}

export async function completeOnboarding(_previous: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  if (profile.onboardingCompletedAt) {
    redirect("/aujourdhui");
  }
  const parsed = await auditFromForm(form);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Certains champs sont invalides. Corrige-les puis renvoie le formulaire.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  await saveBaselineAudit(user.id, toDayKey(new Date(), profile.timeZone), parsed.data);
  redirect("/aujourdhui");
}
