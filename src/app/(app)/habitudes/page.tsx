import type { Metadata } from "next";
import { Suspense } from "react";
import { HabitScience } from "@/components/habit-science";
import { SubmitButton } from "@/components/submit-button";
import { UnlockButton } from "@/components/unlock-button";
import { addDays } from "@/domain/dates";
import { completionRate, MAX_FORMING_HABITS, STABILITY_WINDOW_DAYS, type Habit } from "@/domain/habits";
import { PILLARS } from "@/domain/pillars";
import { applyProgression, loadHabitState } from "@/server/data/habits";
import { requireAppContext } from "@/server/data/profile";
import { AddHabitForm } from "./add-habit-form";
import { deleteHabitAction, moveHabitAction, pauseHabitAction, requeueHabitAction } from "./actions";

export const metadata: Metadata = { title: "Habitudes" };

function cadenceLabel(habit: Habit): string {
  return habit.cadence.kind === "daily" ? "Chaque jour" : `${habit.cadence.timesPerWeek} fois par semaine`;
}

function percent(rate: number | null): string {
  return rate === null ? "pas encore mesurable" : `${Math.round(rate * 100)} %`;
}

function HiddenId({ id }: { id: string }) {
  return <input type="hidden" name="habitId" value={id} />;
}

async function Habits() {
  const { user, today } = await requireAppContext();
  await applyProgression(user.id, today);
  const { habits, checkIns } = await loadHabitState(user.id, today);
  const yesterday = addDays(today, -1);
  const forming = habits.filter((habit) => habit.status === "forming");
  const stable = habits.filter((habit) => habit.status === "stable");
  const paused = habits.filter((habit) => habit.status === "paused");
  const locked = habits.filter((habit) => habit.status === "locked");
  const slotsFull = forming.length >= MAX_FORMING_HABITS;

  return (
    <>
      <section className="card flex flex-col gap-4" aria-labelledby="forming-title">
        <h2 id="forming-title" className="section-title">
          En construction ({forming.length}/{MAX_FORMING_HABITS})
        </h2>
        {forming.length === 0 && <p>Aucune habitude en construction. Débloque la première de ta file.</p>}
        <ul className="flex flex-col gap-3">
          {forming.map((habit) => {
            const rate = completionRate(habit, checkIns, yesterday);
            return (
              <li key={habit.id} className="rounded-lg border border-border p-3">
                <p className="font-semibold">{habit.title}</p>
                <p className="hint">
                  {PILLARS[habit.pillar].name} · {cadenceLabel(habit)} · depuis le {habit.activatedOn}
                </p>
                <p>
                  Régularité sur les {STABILITY_WINDOW_DAYS} derniers jours : <strong>{percent(rate)}</strong>
                  {rate !== null && (
                    <meter className="ml-2 align-middle" min={0} max={1} low={0.5} high={0.8} optimum={1} value={rate} aria-label="Régularité" />
                  )}
                </p>
                <form action={pauseHabitAction} className="mt-2">
                  <HiddenId id={habit.id} />
                  <SubmitButton variant="secondary" pendingLabel="Pause…">Mettre en pause</SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <HabitScience />

      <section className="card flex flex-col gap-4" aria-labelledby="queue-title">
        <h2 id="queue-title" className="section-title">File d&apos;attente</h2>
        {slotsFull && (
          <p id="slots-full" className="hint">
            Les {MAX_FORMING_HABITS} places sont prises. Une habitude se débloque quand une autre atteint 80 % de
            régularité sur 6 semaines, ou si tu en mets une en pause.
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {locked.map((habit, index) => (
            <li key={habit.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex-1">
                <p className="font-semibold">{index + 1}. {habit.title}</p>
                <p className="hint">{PILLARS[habit.pillar].name} · {cadenceLabel(habit)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={moveHabitAction}>
                  <HiddenId id={habit.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" className="btn-secondary" aria-label={`Monter « ${habit.title} » dans la file`} disabled={index === 0}>↑</button>
                </form>
                <form action={moveHabitAction}>
                  <HiddenId id={habit.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" className="btn-secondary" aria-label={`Descendre « ${habit.title} » dans la file`} disabled={index === locked.length - 1}>↓</button>
                </form>
                <UnlockButton habitId={habit.id} title={habit.title} disabled={slotsFull} />
                <form action={deleteHabitAction}>
                  <HiddenId id={habit.id} />
                  <button type="submit" className="btn-secondary" aria-label={`Supprimer « ${habit.title} »`}>Supprimer</button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {stable.length > 0 && (
        <section className="card flex flex-col gap-3" aria-labelledby="stable-title">
          <h2 id="stable-title" className="section-title">Stables</h2>
          <ul className="list-disc pl-6">
            {stable.map((habit) => (
              <li key={habit.id}>{habit.title} ({percent(completionRate(habit, checkIns, yesterday))} sur 6 semaines)</li>
            ))}
          </ul>
        </section>
      )}

      {paused.length > 0 && (
        <section className="card flex flex-col gap-3" aria-labelledby="paused-title">
          <h2 id="paused-title" className="section-title">En pause</h2>
          <ul className="flex flex-col gap-2">
            {paused.map((habit) => (
              <li key={habit.id} className="flex flex-wrap items-center gap-3">
                <span className="flex-1">{habit.title}</span>
                <form action={requeueHabitAction}>
                  <HiddenId id={habit.id} />
                  <SubmitButton variant="secondary" pendingLabel="…">Remettre dans la file</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card flex flex-col gap-4" aria-labelledby="add-title">
        <h2 id="add-title" className="section-title">Ajouter une habitude</h2>
        <AddHabitForm />
      </section>
    </>
  );
}

export default function HabitsPage() {
  return (
    <>
      <h1 className="page-title">Habitudes</h1>
      <p>Deux habitudes en construction au maximum. La suivante se débloque quand une précédente est stable.</p>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Habits />
      </Suspense>
    </>
  );
}
