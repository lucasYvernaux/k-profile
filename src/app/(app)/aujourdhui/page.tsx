import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { doneInLastSevenDays, isTrackedOn, missNudge, planProgression } from "@/domain/habits";
import { currentPhase } from "@/domain/roadmap";
import { currentBlockIndex, sortSchedule } from "@/domain/schedule";
import { UnlockButton } from "@/components/unlock-button";
import { VigilanceList } from "@/components/vigilance-list";
import { getDailyRecord } from "@/server/data/entries";
import { applyProgression, loadHabitState } from "@/server/data/habits";
import { requireAppContext } from "@/server/data/profile";
import { loadVigilance } from "@/server/data/vigilance";
import { HealthForm, PrioritiesForm } from "./daily-forms";
import { HabitChecklist, type ChecklistHabit } from "./habit-checklist";

export const metadata: Metadata = { title: "Aujourd'hui" };

function formatDay(day: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

function currentTime(timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date());
}

async function Today() {
  const { user, profile, today } = await requireAppContext();
  await applyProgression(user.id, today);
  const [{ habits, checkIns }, daily] = await Promise.all([
    loadHabitState(user.id, today),
    getDailyRecord(user.id, today),
  ]);
  const signals = await loadVigilance(user.id, today, profile.programStart, habits, checkIns);
  const { unlockable } = planProgression(habits, checkIns, today);
  const nextHabit = habits.find((habit) => habit.id === unlockable[0]);
  const phase = currentPhase(profile.programStart, today);

  const checklist: ChecklistHabit[] = habits
    .filter((habit) => isTrackedOn(habit, today))
    .map((habit) => ({
      id: habit.id,
      title: habit.title,
      done: checkIns.some((checkIn) => checkIn.habitId === habit.id && checkIn.day === today),
      weekly:
        habit.cadence.kind === "weekly"
          ? { target: habit.cadence.timesPerWeek, doneLastSevenDays: doneInLastSevenDays(habit.id, checkIns, today) }
          : null,
      nudge: missNudge(habit, checkIns, today),
    }));

  const schedule = sortSchedule(profile.schedule);
  const activeBlock = currentBlockIndex(schedule, currentTime(profile.timeZone));

  return (
    <>
      <p className="text-lg">
        {formatDay(today)} · Phase {phase.window.phase.number} : {phase.window.phase.name}
      </p>

      {nextHabit && (
        <section className="notice flex flex-col gap-2" aria-labelledby="unlock-title">
          <h2 id="unlock-title" className="section-title">Une place est libre</h2>
          <p>Tu peux construire jusqu&apos;à 2 habitudes à la fois. Prochaine dans ta file :</p>
          <UnlockButton habitId={nextHabit.id} title={nextHabit.title} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4" aria-labelledby="priorities-title">
          <h2 id="priorities-title" className="section-title">Les 3 priorités du jour</h2>
          <PrioritiesForm day={today} priorities={daily.priorities} />
        </section>

        <section className="card flex flex-col gap-4" aria-labelledby="habits-title">
          <h2 id="habits-title" className="section-title">Habitudes</h2>
          <HabitChecklist key={today} day={today} habits={checklist} />
        </section>

        <section className="card flex flex-col gap-4" aria-labelledby="health-title">
          <h2 id="health-title" className="section-title">Sommeil et alcool</h2>
          <p className="hint">Facultatif. Sert uniquement aux signaux de vigilance.</p>
          <HealthForm day={today} sleepHours={daily.health.sleepHours} drinks={daily.health.drinks} />
        </section>

        <section className="card flex flex-col gap-4" aria-labelledby="schedule-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="schedule-title" className="section-title">Journée type</h2>
            <Link href="/reglages#journee-type" className="link">
              Modifier
            </Link>
          </div>
          <ol className="flex flex-col gap-1">
            {schedule.map((block, index) => (
              <li
                key={`${block.start}-${block.label}`}
                aria-current={index === activeBlock ? "time" : undefined}
                className={`flex gap-3 rounded px-2 py-1 ${index === activeBlock ? "bg-accent-soft font-semibold" : ""}`}
              >
                <span className="w-28 shrink-0 tabular-nums">
                  {block.start}
                  {block.end ? `–${block.end}` : ""}
                </span>
                <span>
                  {block.label}
                  {index === activeBlock && <span className="sr-only"> (en cours)</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card flex flex-col gap-4" aria-labelledby="vigilance-title">
        <h2 id="vigilance-title" className="section-title">Signaux de vigilance</h2>
        <VigilanceList signals={signals} />
      </section>

      <p>
        <Link href="/journal" className="link">
          Écrire le journal du soir
        </Link>
      </p>
    </>
  );
}

export default function TodayPage() {
  return (
    <>
      <h1 className="page-title">Aujourd&apos;hui</h1>
      <Suspense fallback={<p role="status">Chargement de ta journée…</p>}>
        <Today />
      </Suspense>
    </>
  );
}
