"use client";

import type { FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { StatusMessage } from "@/components/status-message";
import { MAX_DAILY_PRIORITIES } from "@/domain/schedule";
import { useSync } from "@/lib/use-sync";

export function PrioritiesForm({ day, priorities }: { day: string; priorities: string[] }) {
  const { send, message, pending } = useSync();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send({
      kind: "priorities",
      day,
      priorities: form.getAll("priority").map((value) => String(value)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {Array.from({ length: MAX_DAILY_PRIORITIES }, (_, index) => (
        <FormField
          key={index}
          id={`priority-${index}`}
          name="priority"
          label={`Priorité ${index + 1}`}
          defaultValue={priorities[index] ?? ""}
          maxLength={140}
          autoComplete="off"
        />
      ))}
      <StatusMessage message={message} tone="success" />
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        Enregistrer les priorités
      </button>
    </form>
  );
}

interface HealthFormProps {
  day: string;
  sleepHours: number | null;
  drinks: number | null;
}

export function HealthForm({ day, sleepHours, drinks }: HealthFormProps) {
  const { send, message, pending } = useSync();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value === "" ? null : Number(value);
    };
    await send({ kind: "health", day, sleepHours: read("sleepHours"), drinks: read("drinks") });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="sleepHours" label="Sommeil la nuit dernière (heures)" type="number" inputMode="decimal" min={0} max={24} step={0.25} defaultValue={sleepHours ?? ""} />
        <FormField id="drinks" label="Verres d'alcool aujourd'hui" type="number" inputMode="numeric" min={0} max={50} step={1} defaultValue={drinks ?? ""} />
      </div>
      <StatusMessage message={message} tone="success" />
      <button type="submit" className="btn-secondary self-start" disabled={pending}>
        Enregistrer
      </button>
    </form>
  );
}
