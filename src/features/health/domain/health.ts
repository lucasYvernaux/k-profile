/* Le Temple — constantes et calculs santé (utilisable client et serveur) */

export type BodyMetric = {
  id: number;
  date: string;
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arm: number | null;
  forearm: number | null;
  thigh: number | null;
  calf: number | null;
  notes: string | null;
};

export type Exercise = {
  name: string;
  sets: number | null;
  reps: number | null;
  /** Charge en kg. Au poids du corps : lest ajouté (négatif = assistance, élastique…) */
  weight: number | null;
  /** Exercice au poids du corps (pompes, tractions, gainage…) */
  bw?: boolean;
  /** Durée d'une série en secondes, pour les exercices tenus (gainage, L-sit…) */
  seconds?: number | null;
};

export type Workout = {
  id: number;
  date: string;
  type: string;
  title: string | null;
  durationMin: number | null;
  intensity: number | null;
  calories: number | null;
  distanceKm: number | null;
  exercises: string | null;
  notes: string | null;
};

export type SanteConfig = {
  weeklyGoal: number; // séances par semaine
  targetWeightKg: number | null;
  sex: "homme" | "femme";
};

export const DEFAULT_SANTE: SanteConfig = { weeklyGoal: 4, targetWeightKg: null, sex: "homme" };

/** Mensurations (cm) — ordre d'affichage */
export const MEASURES = [
  { key: "neck", label: "Cou" },
  { key: "shoulders", label: "Épaules" },
  { key: "chest", label: "Poitrine" },
  { key: "waist", label: "Taille (ventre)" },
  { key: "hips", label: "Hanches" },
  { key: "arm", label: "Bras" },
  { key: "forearm", label: "Avant-bras" },
  { key: "thigh", label: "Cuisse" },
  { key: "calf", label: "Mollet" },
] as const;

export type MeasureKey = (typeof MEASURES)[number]["key"];
export const NUMERIC_FIELDS = ["weightKg", "heightCm", "bodyFatPct", ...MEASURES.map((m) => m.key)] as const;

export const WORKOUT_TYPES: Record<string, { label: string; icon: string; color: string; cardio?: boolean; exercises?: boolean; bodyweight?: boolean }> = {
  muscu: { label: "Musculation", icon: "dumbbell", color: "#d4af37", exercises: true },
  poids_corps: { label: "Poids du corps", icon: "person-standing", color: "#14b8a6", exercises: true, bodyweight: true },
  course: { label: "Course", icon: "footprints", color: "#10b981", cardio: true },
  velo: { label: "Vélo", icon: "bike", color: "#38bdf8", cardio: true },
  natation: { label: "Natation", icon: "waves", color: "#60a5fa", cardio: true },
  marche: { label: "Marche", icon: "mountain", color: "#84cc16", cardio: true },
  combat: { label: "Combat", icon: "swords", color: "#f87171", exercises: true },
  hiit: { label: "HIIT", icon: "zap", color: "#f97316", exercises: true },
  yoga: { label: "Yoga / Mobilité", icon: "flower-2", color: "#a78bfa" },
  sport: { label: "Sport collectif", icon: "trophy", color: "#eab308" },
  autre: { label: "Autre", icon: "activity", color: "#a3a3a3", exercises: true },
};

export function typeMeta(type: string) {
  return WORKOUT_TYPES[type] ?? WORKOUT_TYPES.autre;
}

export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(v: number): { label: string; color: string } {
  if (v < 18.5) return { label: "Maigreur", color: "#38bdf8" };
  if (v < 25) return { label: "Corpulence normale", color: "#10b981" };
  if (v < 30) return { label: "Surpoids", color: "#d4af37" };
  return { label: "Obésité", color: "#f87171" };
}

/** Estimation masse grasse — méthode US Navy (mesures en cm) */
export function navyBodyFat(
  sex: "homme" | "femme",
  heightCm: number | null,
  neck: number | null,
  waist: number | null,
  hips: number | null
): number | null {
  if (!heightCm || !neck || !waist) return null;
  let v: number;
  if (sex === "femme") {
    if (!hips || waist + hips - neck <= 0) return null;
    v = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(heightCm)) - 450;
  } else {
    if (waist - neck <= 0) return null;
    v = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  return Number.isFinite(v) && v > 2 && v < 70 ? v : null;
}

export function parseExercises(raw: string | null): Exercise[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Exercices au poids du corps courants.
 * ratio = part du poids du corps réellement déplacée (estimations usuelles :
 * une pompe ≈ 64 % du poids, une traction ≈ 100 %). timed = exercice tenu (en secondes).
 */
export const BODYWEIGHT_EXERCISES: { name: string; ratio: number; timed?: boolean }[] = [
  { name: "Pompes", ratio: 0.64 },
  { name: "Pompes sur les genoux", ratio: 0.49 },
  { name: "Pompes inclinées", ratio: 0.41 },
  { name: "Pompes déclinées", ratio: 0.74 },
  { name: "Pompes diamant", ratio: 0.66 },
  { name: "Pompes archer", ratio: 0.8 },
  { name: "Pike push-up", ratio: 0.7 },
  { name: "Pompes en équilibre (HSPU)", ratio: 0.95 },
  { name: "Tractions", ratio: 1 },
  { name: "Tractions supination (chin-up)", ratio: 1 },
  { name: "Tractions australiennes", ratio: 0.6 },
  { name: "Muscle-up", ratio: 1 },
  { name: "Dips", ratio: 0.95 },
  { name: "Dips sur banc", ratio: 0.6 },
  { name: "Squats", ratio: 0.7 },
  { name: "Squats sautés", ratio: 0.7 },
  { name: "Fentes", ratio: 0.7 },
  { name: "Squat bulgare", ratio: 0.8 },
  { name: "Pistol squat", ratio: 0.85 },
  { name: "Hip thrust", ratio: 0.5 },
  { name: "Mollets debout", ratio: 1 },
  { name: "Burpees", ratio: 0.6 },
  { name: "Relevés de jambes", ratio: 0.35 },
  { name: "Crunchs", ratio: 0.3 },
  { name: "Gainage", ratio: 0.6, timed: true },
  { name: "Gainage latéral", ratio: 0.5, timed: true },
  { name: "Chaise", ratio: 0.7, timed: true },
  { name: "Hollow body", ratio: 0.5, timed: true },
  { name: "L-sit", ratio: 0.9, timed: true },
  { name: "Équilibre sur les mains", ratio: 1, timed: true },
  { name: "Front lever", ratio: 1, timed: true },
  { name: "Planche", ratio: 1, timed: true },
  { name: "Suspension", ratio: 1, timed: true },
];

/** Ratio par défaut pour un exercice au poids du corps hors catalogue */
export const DEFAULT_BW_RATIO = 0.65;

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function bodyweightInfo(name: string) {
  const key = norm(name);
  return key ? BODYWEIGHT_EXERCISES.find((e) => norm(e.name) === key) : undefined;
}

/** Charge déplacée par répétition : charge, ou part du poids du corps + lest */
export function loadOf(e: Exercise, bodyWeightKg: number | null = null): number {
  if (!e.bw) return e.weight ?? 0;
  const ratio = bodyweightInfo(e.name)?.ratio ?? DEFAULT_BW_RATIO;
  return Math.max(0, (bodyWeightKg ?? 0) * ratio + (e.weight ?? 0));
}

/**
 * Tonnage : Σ séries × reps × charge. Au poids du corps, la charge est estimée
 * à partir du poids du jour (si connu). Les exercices tenus (secondes) ne comptent pas.
 */
export function volumeOf(ex: Exercise[], bodyWeightKg: number | null = null): number {
  return ex.reduce((s, e) => s + (e.sets ?? 0) * (e.reps ?? 0) * loadOf(e, bodyWeightKg), 0);
}

/** Totaux au poids du corps d'une séance : répétitions et secondes tenues */
export function bodyweightTotals(ex: Exercise[]): { reps: number; seconds: number } {
  return ex
    .filter((e) => e.bw)
    .reduce(
      (t, e) => ({ reps: t.reps + (e.sets ?? 1) * (e.reps ?? 0), seconds: t.seconds + (e.sets ?? 1) * (e.seconds ?? 0) }),
      { reps: 0, seconds: 0 }
    );
}

/** Poids du corps le plus récent à cette date (ou le premier connu s'il n'y en a pas avant) */
export function bodyWeightOn(rows: Pick<BodyMetric, "date" | "weightKg">[], date: string): number | null {
  const known = rows.filter((r) => r.weightKg).sort((a, b) => a.date.localeCompare(b.date));
  if (!known.length) return null;
  return ([...known].reverse().find((r) => r.date <= date) ?? known[0]).weightKg;
}

export type BodyweightRecord = { name: string; best: number; unit: "reps" | "s"; lest: number | null; date: string };

/** Meilleure série par exercice au poids du corps (reps, ou secondes tenues) */
export function bodyweightRecords(sessions: Pick<Workout, "date" | "exercises">[]): BodyweightRecord[] {
  const best = new Map<string, BodyweightRecord>();
  for (const s of sessions) {
    for (const e of parseExercises(s.exercises)) {
      if (!e.bw || !e.name.trim()) continue;
      const unit = e.seconds ? "s" : "reps";
      const value = (unit === "s" ? e.seconds : e.reps) ?? 0;
      if (!value) continue;
      const key = `${norm(e.name)}|${unit}`;
      const current = best.get(key);
      const lest = e.weight || null;
      // à valeur égale, la série la plus lestée puis la plus récente gagne
      if (!current || value > current.best || (value === current.best && ((lest ?? 0) > (current.lest ?? 0) || s.date > current.date))) {
        best.set(key, { name: e.name.trim(), best: value, unit, lest, date: s.date });
      }
    }
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** "45 s", "1 min 30" */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m} min ${String(s).padStart(2, "0")}` : `${m} min`;
}

export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
