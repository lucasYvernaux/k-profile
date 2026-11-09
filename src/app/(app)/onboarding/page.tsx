import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { toDayKey } from "@/domain/dates";
import { ensureProfile } from "@/server/data/profile";
import { requireUser } from "@/server/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Phase 0 : audit" };

async function Onboarding() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  if (profile.onboardingCompletedAt) {
    redirect("/aujourdhui");
  }
  return <OnboardingForm today={toDayKey(new Date(), profile.timeZone)} />;
}

export default function OnboardingPage() {
  return (
    <>
      <h1 className="page-title">Phase 0 : ton point de départ</h1>
      <p>
        Cet audit sert de base de comparaison pour les revues trimestrielles. Remplis ce que tu
        connais, laisse vide le reste : tu pourras compléter plus tard. Toutes ces données sont
        chiffrées.
      </p>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Onboarding />
      </Suspense>
    </>
  );
}
