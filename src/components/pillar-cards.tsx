import type { Indicator } from "@/domain/indicators";
import { PILLAR_IDS, PILLARS, type PillarId } from "@/domain/pillars";

interface PillarCardsProps {
  indicators: Record<PillarId, Indicator[]>;
  latestScores?: Record<PillarId, number>;
  headingLevel?: 2 | 3;
}

export function PillarCards({ indicators, latestScores, headingLevel = 2 }: PillarCardsProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {PILLAR_IDS.map((pillar) => {
        const { name, inspiredBy, summary } = PILLARS[pillar];
        return (
          <li key={pillar} className="card flex flex-col gap-2">
            <Heading className="section-title">{name}</Heading>
            <p className="hint">Inspiré de {inspiredBy}. {summary}</p>
            {latestScores && <p>Dernière note de revue : <strong>{latestScores[pillar]}/10</strong></p>}
            {indicators[pillar].length === 0 ? (
              <p className="text-muted">Aucune habitude active sur ce pilier pour l&apos;instant.</p>
            ) : (
              <dl className="flex flex-col gap-1">
                {indicators[pillar].map((indicator) => (
                  <div key={indicator.label} className="flex flex-wrap justify-between gap-x-3">
                    <dt>{indicator.label}</dt>
                    <dd className="font-semibold tabular-nums">{indicator.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
