/* Domaines / centres d'intérêt shared by people (pure, client and server). */

export type Interest = { id: number; name: string; key: string; color: string | null };
export type PersonInterest = { id: number; personId: number; interestId: number };

export const INTEREST_COLORS = [
  "#f59e0b", "#f87171", "#ec4899", "#a78bfa", "#6366f1", "#38bdf8",
  "#14b8a6", "#10b981", "#84cc16", "#eab308", "#f97316", "#94a3b8",
] as const;

/** Ideas offered while typing (any other domain can be typed). */
export const INTEREST_SUGGESTIONS = [
  "Mangas", "Animés", "Jeux vidéo", "Jeux de société", "Lecture", "Cinéma", "Séries", "Musique", "Concerts",
  "Sport", "Musculation", "Course à pied", "Football", "Escalade", "Randonnée", "Arts martiaux", "Cuisine",
  "Voyage", "Photographie", "Dessin", "Tech", "Programmation", "Crypto", "Mode", "Nature", "Spiritualité",
  "Entrepreneuriat", "Politique", "Histoire", "Sciences",
];

/** "  Mangàs " → "mangas": two names with the same key are the same domain. */
export function interestKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Display name: trimmed, single spaces, first letter in capital. */
export function interestName(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function interestColor(interest: Pick<Interest, "key" | "color">): string {
  if (interest.color) return interest.color;
  let hash = 0;
  for (const char of interest.key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return INTEREST_COLORS[hash % INTEREST_COLORS.length];
}

/** Removes duplicates (same key) and blanks, keeping the first spelling. */
export function uniqueInterestNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const key = interestKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(interestName(raw));
  }
  return out;
}
