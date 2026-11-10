/* Colour scale for 0-100 scores (bright gold → gold → orange → blood → ash). */

export function scoreColor(pct: number): string {
  if (pct >= 90) return "#e6c35c"; // or brillant
  if (pct >= 75) return "#d4af37"; // or
  if (pct >= 50) return "#ea580c"; // orange
  if (pct >= 25) return "#991b1b"; // rouge sombre
  if (pct > 0) return "#7f1d1d";
  return "#262626"; // noir/gris foncé
}

/**
 * Same scale for TEXT: every shade reaches 4.5:1 on the lightest surface (#333333,
 * WCAG 1.4.3). The dark reds of scoreColor() are for fills only (1.9:1 as text).
 */
export function scoreTextColor(pct: number): string {
  if (pct >= 90) return "#e6c35c";
  if (pct >= 75) return "#d4af37";
  if (pct >= 50) return "#fb923c";
  if (pct > 0) return "#f87171";
  return "#a0a0a0";
}
