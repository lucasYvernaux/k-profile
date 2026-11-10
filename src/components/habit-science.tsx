import { HABIT_FORMATION, SOURCES } from "@/domain/sources";

/** What research says about habit formation, with sources. Never promises a fixed duration. */
export function HabitScience() {
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">Combien de temps pour ancrer une habitude ?</summary>
      <div className="mt-3 flex flex-col gap-2">
        <p>
          Il n&apos;y a pas de durée fixe. Dans l&apos;étude de Lally et al. (2010), le temps pour
          atteindre le plateau d&apos;automaticité allait de {HABIT_FORMATION.minDays} jours à{" "}
          {HABIT_FORMATION.maxPredictedDays} jours (estimation extrapolée au-delà des 84 jours de
          l&apos;étude), avec une moyenne de {HABIT_FORMATION.medianDays} jours. Les comportements
          d&apos;exercice ont pris environ {HABIT_FORMATION.exerciseSlowdownFactor.toLocaleString("fr-FR")} fois
          plus de temps que boire ou manger.
        </p>
        <p>
          Rater un jour isolé a eu peu d&apos;effet ; ce sont les oublis répétés qui ont réduit le
          niveau d&apos;automaticité atteint. D&apos;où la règle : ne jamais rater deux jours d&apos;affilée.
        </p>
        <p>
          Le seuil « stable » d&apos;Hespéride (80 % sur 6 semaines) est un choix de conception, pas un chiffre
          scientifique.
        </p>
        <p className="hint">
          Sources :{" "}
          <a href={SOURCES.lally2010.url} className="link" target="_blank" rel="noopener noreferrer">{SOURCES.lally2010.citation}</a>
          {" ; "}
          <a href={SOURCES.lally2010Digest.url} className="link" target="_blank" rel="noopener noreferrer">{SOURCES.lally2010Digest.citation}</a>.
        </p>
      </div>
    </details>
  );
}
