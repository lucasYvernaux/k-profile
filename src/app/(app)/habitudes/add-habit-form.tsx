"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";
import { SubmitButton } from "@/components/submit-button";
import { PILLAR_IDS, PILLARS } from "@/domain/pillars";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { addHabitAction } from "./actions";

export function AddHabitForm() {
  const [state, action] = useActionState(addHabitAction, INITIAL_FORM_STATE);
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField id="title" label="Intitulé" maxLength={80} required error={state.fieldErrors?.title} />
      <div className="field">
        <label htmlFor="pillar" className="label">Pilier</label>
        <select id="pillar" name="pillar" className="input" defaultValue="mental">
          {PILLAR_IDS.map((pillar) => (
            <option key={pillar} value={pillar}>{PILLARS[pillar].name}</option>
          ))}
        </select>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="label">Fréquence</legend>
        <div className="flex flex-wrap gap-4">
          {(["daily", "weekly"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="cadence" value={value} checked={cadence === value} onChange={() => setCadence(value)} className="size-5" />
              {value === "daily" ? "Chaque jour" : "Plusieurs fois par semaine"}
            </label>
          ))}
        </div>
      </fieldset>
      {cadence === "weekly" && (
        <FormField id="timesPerWeek" label="Fois par semaine" type="number" min={1} max={7} defaultValue={3} required error={state.fieldErrors?.timesPerWeek} />
      )}
      <StatusMessage message={state.message} tone={state.status === "error" ? "error" : "success"} />
      <SubmitButton pendingLabel="Ajout…">Ajouter à la file</SubmitButton>
    </form>
  );
}
