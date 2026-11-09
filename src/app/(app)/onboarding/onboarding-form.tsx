"use client";

import { useActionState } from "react";
import { AuditFields } from "@/components/audit-fields";
import { StatusMessage } from "@/components/status-message";
import { SubmitButton } from "@/components/submit-button";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { completeOnboarding } from "./actions";

export function OnboardingForm({ today }: { today: string }) {
  const [state, action] = useActionState(completeOnboarding, INITIAL_FORM_STATE);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <AuditFields errors={state.fieldErrors} defaultDate={today} />
      <StatusMessage message={state.status === "error" ? state.message : null} />
      <SubmitButton pendingLabel="Enregistrement de l'audit…">Enregistrer mon point de départ</SubmitButton>
    </form>
  );
}
