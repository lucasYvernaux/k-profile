/* Date helpers for "YYYY-MM-DD" business dates, in the user's local time zone. */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function diffDays(a: string, b: string): number {
  const ms = parseKey(a).getTime() - parseKey(b).getTime();
  return Math.round(ms / 86400000);
}

export function monthKey(key: string): string {
  return key.slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function minutesOf(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** Lundi de la semaine contenant `key` */
export function weekStartOf(key: string): string {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - dow);
  return toDateKey(d);
}

/** Jour de la semaine d'une date "YYYY-MM-DD" — 0 = dimanche … 6 = samedi */
export function weekdayOf(key: string): number {
  return parseKey(key).getDay();
}

/** Une phase/habitude s'applique-t-elle ce jour-là ? (null/vide = tous les jours) */
export function appliesOn(daysOfWeek: string | null | undefined, dateKey: string): boolean {
  if (!daysOfWeek) return true;
  try {
    const days = JSON.parse(daysOfWeek) as number[];
    if (!Array.isArray(days) || days.length === 0) return true;
    return days.includes(weekdayOf(dateKey));
  } catch {
    return true;
  }
}

export const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const DAY_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function weekdayName(key: string): string {
  return ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][parseKey(key).getDay()];
}

export function formatKeyFr(key: string): string {
  const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const d = parseKey(key);
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]}`;
}

export function monthNameFr(month: string): string {
  const noms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${noms[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}
