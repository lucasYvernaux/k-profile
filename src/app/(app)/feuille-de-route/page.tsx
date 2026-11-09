import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { PERSONALITY_CHANGE, SOURCES } from "@/domain/sources";
import { milestoneCompletion, phaseProgress, phaseWindows } from "@/domain/roadmap";
import { listMilestones } from "@/server/data/progress";
import { requireAppContext } from "@/server/data/profile";
import { toggleMilestoneAction } from "./actions";

export const metadata: Metadata = { title: "Feuille de route" };

const STATUS_LABEL = { past: "Terminée", current: "En cours", upcoming: "À venir" } as const;

function formatDate(day: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

async function Roadmap() {
  const { user, profile, today } = await requireAppContext();
  const milestones = await listMilestones(user.id);
  const windows = phaseWindows(profile.programStart);

  return (
    <ol className="flex flex-col gap-4">
      {windows.map((window) => {
        const progress = phaseProgress(window, today);
        const phaseMilestones = milestones
          .filter((milestone) => milestone.phaseId === window.phase.id)
          .map((milestone) => ({ ...milestone, done: milestone.doneOn !== null }));
        const completion = milestoneCompletion(phaseMilestones);
        const headingId = `phase-${window.phase.id}`;
        return (
          <li key={window.phase.id}>
            <section
              aria-labelledby={headingId}
              aria-current={progress.status === "current" ? "step" : undefined}
              className={`card flex flex-col gap-3 ${progress.status === "current" ? "border-2 border-accent" : ""}`}
            >
              <h2 id={headingId} className="section-title">
                Phase {window.phase.number} : {window.phase.name}
              </h2>
              <p className="hint">
                {window.phase.durationLabel} · du {formatDate(window.start)} au {formatDate(window.end)} ·{" "}
                <strong>{STATUS_LABEL[progress.status]}</strong>
              </p>
              {progress.status === "current" && (
                <p>
                  Temps écoulé : {Math.round(progress.timeElapsed * 100)} %{" "}
                  <progress className="ml-2 align-middle" max={1} value={progress.timeElapsed} aria-label="Temps écoulé dans la phase" />
                </p>
              )}
              <p>
                Jalons atteints : {phaseMilestones.filter((milestone) => milestone.done).length}/{phaseMilestones.length} (
                {Math.round(completion * 100)} %)
              </p>
              <ul className="flex flex-col gap-2">
                {phaseMilestones.map((milestone) => (
                  <li key={milestone.id} className="flex flex-wrap items-center gap-3">
                    <span className={`flex-1 ${milestone.done ? "line-through decoration-2" : ""}`}>
                      {milestone.title}
                      {milestone.done && <span className="sr-only"> (atteint)</span>}
                    </span>
                    <form action={toggleMilestoneAction}>
                      <input type="hidden" name="milestoneId" value={milestone.id} />
                      <input type="hidden" name="done" value={milestone.done ? "false" : "true"} />
                      <SubmitButton variant="secondary" pendingLabel="…">
                        <span>
                          {milestone.done ? "Annuler" : "Marquer atteint"}
                          <span className="sr-only"> : {milestone.title}</span>
                        </span>
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          </li>
        );
      })}
    </ol>
  );
}

export default function RoadmapPage() {
  return (
    <>
      <h1 className="page-title">Feuille de route sur 5 ans</h1>
      <p>Les dates sont calculées à partir de la date de ton audit.</p>
      <details className="card">
        <summary className="cursor-pointer font-semibold">Ce que dit la recherche sur le changement de personnalité</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p>
            Une méta-analyse de {PERSONALITY_CHANGE.studies} études, surtout cliniques, a observé des changements
            nets des traits de personnalité au cours d&apos;interventions d&apos;une durée moyenne de{" "}
            {PERSONALITY_CHANGE.averageInterventionWeeks} semaines (Roberts et al., 2017).
          </p>
          <p>
            Dans Hudson et al. (2019), accepter des défis ne prédisait pas de changement ; seuls les défis
            réellement accomplis le prédisaient. Le changement suit le passage à l&apos;acte.
          </p>
          <p className="hint">
            Sources :{" "}
            <a href={SOURCES.roberts2017.url} className="link" target="_blank" rel="noopener noreferrer">{SOURCES.roberts2017.citation}</a>
            {" ; "}
            <a href={SOURCES.hudson2018.url} className="link" target="_blank" rel="noopener noreferrer">{SOURCES.hudson2018.citation}</a>.
          </p>
        </div>
      </details>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Roadmap />
      </Suspense>
    </>
  );
}
