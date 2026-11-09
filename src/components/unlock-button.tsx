"use client";

import { useActionState } from "react";
import { activateHabitAction } from "@/app/(app)/habitudes/actions";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { StatusMessage } from "./status-message";
import { SubmitButton } from "./submit-button";

export function UnlockButton({ habitId, title, disabled = false }: { habitId: string; title: string; disabled?: boolean }) {
  const [state, action] = useActionState(activateHabitAction, INITIAL_FORM_STATE);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="habitId" value={habitId} />
      {disabled ? (
        <button type="button" className="btn-secondary" disabled aria-describedby="slots-full">
          Débloquer « {title} »
        </button>
      ) : (
        <SubmitButton variant="primary" pendingLabel="Déblocage…">
          Débloquer « {title} »
        </SubmitButton>
      )}
      <StatusMessage message={state.message} tone={state.status === "error" ? "error" : "success"} />
    </form>
  );
}
