import { MAX_SCORE, MIN_SCORE, type ScoreSeries } from "@/domain/review";
import { PILLARS } from "@/domain/pillars";

const WIDTH = 280;
const HEIGHT = 140;
const PADDING = { top: 12, right: 36, bottom: 24, left: 28 };
const GRID_VALUES = [1, 5, 10];

function y(score: number): number {
  const ratio = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  return PADDING.top + (1 - ratio) * (HEIGHT - PADDING.top - PADDING.bottom);
}

function x(index: number, count: number): number {
  const span = WIDTH - PADDING.left - PADDING.right;
  return count === 1 ? PADDING.left + span / 2 : PADDING.left + (index / (count - 1)) * span;
}

/** One small line chart per pillar, all on the same 1-10 scale, plus a table view. */
export function ScoreCharts({ series }: { series: ScoreSeries[] }) {
  const quarters = series[0]?.points.map((point) => point.quarter) ?? [];
  if (quarters.length === 0) {
    return <p>Le graphique apparaîtra après ta première revue trimestrielle.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.map(({ pillar, points }) => {
          const title = PILLARS[pillar].name;
          const last = points.at(-1);
          const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index, points.length)},${y(point.score)}`).join(" ");
          return (
            <li key={pillar} className="rounded-lg border border-border p-3">
              <figure>
                <figcaption className="font-semibold">{title}</figcaption>
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`${title} : ${points.map((point) => `${point.quarter} ${point.score} sur 10`).join(", ")}`}>
                  {GRID_VALUES.map((value) => (
                    <g key={value}>
                      <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y(value)} y2={y(value)} stroke="var(--border)" strokeOpacity={0.4} strokeWidth={1} />
                      <text x={PADDING.left - 6} y={y(value)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted)">{value}</text>
                    </g>
                  ))}
                  {points.length > 1 && (
                    <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {points.map((point, index) => (
                    <g key={point.quarter}>
                      <title>{`${point.quarter} : ${point.score}/10`}</title>
                      <circle cx={x(index, points.length)} cy={y(point.score)} r={12} fill="transparent" />
                      <circle cx={x(index, points.length)} cy={y(point.score)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
                    </g>
                  ))}
                  {last && (
                    <text x={x(points.length - 1, points.length) + 8} y={y(last.score)} dominantBaseline="middle" fontSize={12} fontWeight={600} fill="var(--foreground)">
                      {last.score}
                    </text>
                  )}
                  <text x={x(0, quarters.length)} y={HEIGHT - 6} textAnchor={quarters.length === 1 ? "middle" : "start"} fontSize={11} fill="var(--muted)">{quarters[0]}</text>
                  {quarters.length > 1 && (
                    <text x={WIDTH - PADDING.right} y={HEIGHT - 6} textAnchor="end" fontSize={11} fill="var(--muted)">{quarters.at(-1)}</text>
                  )}
                </svg>
              </figure>
            </li>
          );
        })}
      </ul>
      <details>
        <summary className="cursor-pointer font-semibold">Voir les notes sous forme de tableau</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Notes trimestrielles par pilier, sur 10</caption>
            <thead>
              <tr>
                <th scope="col" className="pr-4">Pilier</th>
                {quarters.map((quarter) => (
                  <th key={quarter} scope="col" className="pr-4 tabular-nums">{quarter}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map(({ pillar, points }) => (
                <tr key={pillar} className="border-t border-border">
                  <th scope="row" className="py-1 pr-4 font-semibold">{PILLARS[pillar].name}</th>
                  {points.map((point) => (
                    <td key={point.quarter} className="pr-4 tabular-nums">{point.score}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
