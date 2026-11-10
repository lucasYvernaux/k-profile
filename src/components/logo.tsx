/** Hespéride mark: one petal per pillar around a core (ADR 0015). Same drawing as public/logo.svg. */
const PETAL = "M50 38 Q61 24 50 9 Q39 24 50 38 Z";

export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path key={angle} d={PETAL} transform={`rotate(${angle} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="6" />
    </svg>
  );
}
