"use client";

import { useState } from "react";
import { StatusMessage } from "@/components/status-message";
import type { MissNudge } from "@/domain/habits";
import { useSync } from "@/lib/use-sync";

export interface ChecklistHabit {
  id: string;
  title: string;
  done: boolean;
  weekly: { target: number; doneLastSevenDays: number } | null;
  nudge: MissNudge;
}

const NUDGE_TEXT: Record<Exclude<MissNudge, "none">, string> = {
  "never-miss-twice": "Hier n'a pas été coché. Aucun souci : l'important est de ne pas rater deux jours d'affilée.",
  "gentle-restart": "Quelques jours sans. Reprends aujourd'hui avec une version plus petite si besoin.",
};

export function HabitChecklist({ day, habits }: { day: string; habits: ChecklistHabit[] }) {
  const [done, setDone] = useState(() => new Map(habits.map((habit) => [habit.id, habit.done])));
  const { send, message } = useSync();

  async function toggle(habitId: string, checked: boolean) {
    setDone((current) => new Map(current).set(habitId, checked));
    const result = await send({ kind: "check-in", habitId, day, done: checked }, { refresh: false });
    if (result === "rejected") {
      setDone((current) => new Map(current).set(habitId, !checked));
    }
  }

  if (habits.length === 0) {
    return <p>Aucune habitude active. Débloque ta première habitude ci-dessus ou dans « Habitudes ».</p>;
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Habitudes du jour</legend>
      <ul className="flex flex-col gap-3">
        {habits.map((habit) => {
          const checked = done.get(habit.id) ?? false;
          const nudgeId = `nudge-${habit.id}`;
          const weeklyCount = habit.weekly
            ? habit.weekly.doneLastSevenDays + (checked && !habit.done ? 1 : 0) - (!checked && habit.done ? 1 : 0)
            : 0;
          return (
            <li key={habit.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <input
                  id={`habit-${habit.id}`}
                  type="checkbox"
                  className="size-6 shrink-0 accent-[var(--accent)]"
                  checked={checked}
                  onChange={(event) => toggle(habit.id, event.target.checked)}
                  aria-describedby={habit.nudge !== "none" && !checked ? nudgeId : undefined}
                />
                <label htmlFor={`habit-${habit.id}`} className="flex-1 font-semibold">
                  {habit.title}
                </label>
                {habit.weekly && (
                  <span className="text-sm text-muted">
                    {weeklyCount}/{habit.weekly.target} sur 7 jours
                  </span>
                )}
              </div>
              {habit.nudge !== "none" && !checked && (
                <p id={nudgeId} className="hint mt-2">
                  {NUDGE_TEXT[habit.nudge]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <StatusMessage message={message} tone="success" />
    </fieldset>
  );
}
