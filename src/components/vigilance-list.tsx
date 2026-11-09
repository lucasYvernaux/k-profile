import { describeSignal, type VigilanceSignal } from "@/domain/vigilance";
import { ALCOHOL_GUIDELINES } from "@/domain/sources";

export function VigilanceList({ signals }: { signals: VigilanceSignal[] }) {
  if (signals.length === 0) {
    return <p>Aucun signal de vigilance en ce moment.</p>;
  }
  const mentionsAlcohol = signals.some((signal) => signal.kind.startsWith("alcohol"));
  return (
    <>
      <ul className="flex flex-col gap-3">
        {signals.map((signal, index) => {
          const { title, suggestion } = describeSignal(signal);
          return (
            <li key={`${signal.kind}-${index}`} className="warning">
              <p className="font-semibold">{title}</p>
              <p>{suggestion}</p>
            </li>
          );
        })}
      </ul>
      {mentionsAlcohol && (
        <p className="hint">
          Source :{" "}
          <a href={ALCOHOL_GUIDELINES.source.url} className="link" target="_blank" rel="noopener noreferrer">
            {ALCOHOL_GUIDELINES.source.citation}
          </a>
          .
        </p>
      )}
    </>
  );
}
