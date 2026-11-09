"use client";

import { useActionState, useState } from "react";
import { StatusMessage } from "@/components/status-message";
import { SubmitButton } from "@/components/submit-button";
import type { ScheduleBlock } from "@/domain/schedule";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { saveScheduleAction } from "./actions";

interface Row extends ScheduleBlock {
  key: string;
}

export function ScheduleEditor({ schedule }: { schedule: ScheduleBlock[] }) {
  const [state, action] = useActionState(saveScheduleAction, INITIAL_FORM_STATE);
  const [rows, setRows] = useState<Row[]>(() => schedule.map((block, index) => ({ ...block, key: `row-${index}` })));

  const remove = (key: string) => setRows((current) => current.filter((row) => row.key !== key));
  const add = () =>
    setRows((current) => [...current, { key: crypto.randomUUID(), start: "12:00", end: null, label: "" }]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <table className="w-full border-separate border-spacing-y-2">
        <caption className="sr-only">Créneaux de la journée type</caption>
        <thead>
          <tr className="text-left">
            <th scope="col">Début</th>
            <th scope="col">Fin (facultatif)</th>
            <th scope="col">Activité</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key}>
              <td className="pr-2">
                <input type="time" name="start" defaultValue={row.start} required className="input w-full" aria-label={`Début du créneau ${index + 1}`} />
              </td>
              <td className="pr-2">
                <input type="time" name="end" defaultValue={row.end ?? ""} className="input w-full" aria-label={`Fin du créneau ${index + 1}`} />
              </td>
              <td className="pr-2">
                <input type="text" name="label" defaultValue={row.label} required maxLength={80} className="input w-full" aria-label={`Activité du créneau ${index + 1}`} />
              </td>
              <td>
                <button type="button" className="btn-secondary" onClick={() => remove(row.key)} aria-label={`Supprimer le créneau ${index + 1}`}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={add}>Ajouter un créneau</button>
        <SubmitButton>Enregistrer la journée type</SubmitButton>
      </div>
      <StatusMessage message={state.message} tone={state.status === "error" ? "error" : "success"} />
    </form>
  );
}
