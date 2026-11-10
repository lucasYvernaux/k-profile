/* ============================================================
   L'INTENDANCE — Eau · Alcool · Caféine
   ============================================================ */

export type IntakeKind = "water" | "alcohol" | "caffeine";

export type Preset = { label: string; amount: number; icon: string };

export type IntakeConfig = {
  waterGoal: number;          // ml / jour
  waterStart: string;         // début fenêtre d'hydratation "HH:mm"
  waterEnd: string;           // fin "HH:mm"
  waterReminderMin: number;   // intervalle mini entre deux rappels (min)
  caffeineLimit: number;      // mg / jour
  caffeineCutoff: string;     // heure limite "HH:mm"
  alcoholDailyLimit: number;  // unités / jour
  alcoholWeeklyLimit: number; // unités / semaine
  presets: Record<IntakeKind, Preset[]>;
  // Profil corporel — nécessaire au calcul d'alcoolémie (Widmark)
  bodyWeightKg: number;
  bodySex: "homme" | "femme";
  /** Seuil légal de conduite en g/L (France : 0,5 — 0,2 pour permis probatoire) */
  legalLimit: number;
};

/** Boisson décrite comme sur l'étiquette : volume (cL) + degré (% vol) */
export type DrinkPreset = { label: string; volumeCl: number; abv: number; icon: string };

export const DRINK_PRESETS: DrinkPreset[] = [
  { label: "Bière blonde", volumeCl: 25, abv: 5, icon: "beer" },
  { label: "Pinte", volumeCl: 50, abv: 5, icon: "beer" },
  { label: "Bière forte", volumeCl: 33, abv: 8, icon: "beer" },
  { label: "Verre de vin", volumeCl: 12, abv: 12.5, icon: "wine" },
  { label: "Coupe de champagne", volumeCl: 10, abv: 12, icon: "wine" },
  { label: "Shot vodka/whisky", volumeCl: 3, abv: 40, icon: "martini" },
  { label: "Cocktail", volumeCl: 10, abv: 15, icon: "martini" },
  { label: "Apéritif / Pastis", volumeCl: 2.5, abv: 45, icon: "martini" },
  { label: "Cidre", volumeCl: 25, abv: 4.5, icon: "apple" },
];

/** Grammes d'alcool pur : volume(ml) × degré × 0,789 (densité de l'éthanol) */
export function gramsOfAlcohol(volumeCl: number, abv: number): number {
  return volumeCl * 10 * (abv / 100) * 0.789;
}

/** Unité standard française = 10 g d'alcool pur */
export function gramsToUnits(grams: number): number {
  return grams / 10;
}
export function unitsToGrams(units: number): number {
  return units * 10;
}

/** Coefficient de diffusion de Widmark */
export function widmarkR(sex: "homme" | "femme"): number {
  return sex === "homme" ? 0.68 : 0.55;
}

/** Taux d'élimination moyen : 0,15 g/L par heure */
export const ELIMINATION_RATE = 0.15;

export type DrinkEvent = { grams: number; hour: number; minute: number };

/**
 * Alcoolémie estimée (g/L) à un instant donné — formule de Widmark.
 * BAC = Σ(grammes) / (poids × r) − élimination × heures écoulées depuis la 1re prise.
 * L'absorption est lissée sur 30 min après chaque verre.
 */
export function estimateBac(
  drinks: DrinkEvent[],
  weightKg: number,
  sex: "homme" | "femme",
  atHour: number,
  atMinute = 0
): number {
  if (drinks.length === 0 || weightKg <= 0) return 0;
  const now = atHour * 60 + atMinute;
  const past = drinks.filter((d) => d.hour * 60 + d.minute <= now);
  if (past.length === 0) return 0;

  const r = widmarkR(sex);
  let absorbed = 0;
  for (const d of past) {
    const elapsed = now - (d.hour * 60 + d.minute);
    // absorption progressive sur 30 minutes
    const factor = Math.min(1, elapsed / 30);
    absorbed += d.grams * factor;
  }
  const peak = absorbed / (weightKg * r);

  const firstAt = Math.min(...past.map((d) => d.hour * 60 + d.minute));
  const hoursSinceFirst = Math.max(0, (now - firstAt) / 60);
  const eliminated = ELIMINATION_RATE * hoursSinceFirst;

  return Math.max(0, Math.round((peak - eliminated) * 1000) / 1000);
}

/** Minutes avant de repasser sous un seuil (g/L). -1 si > 48 h */
export function minutesUntilBelow(
  drinks: DrinkEvent[],
  weightKg: number,
  sex: "homme" | "femme",
  fromHour: number,
  fromMinute: number,
  threshold: number
): number {
  const start = fromHour * 60 + fromMinute;
  for (let t = start; t < start + 48 * 60; t += 5) {
    if (estimateBacExtended(drinks, weightKg, sex, t) <= threshold) return t - start;
  }
  return -1;
}

/** Variante acceptant des minutes > 1440 (lendemain) */
export function estimateBacExtended(
  drinks: DrinkEvent[],
  weightKg: number,
  sex: "homme" | "femme",
  totalMinutes: number
): number {
  if (drinks.length === 0 || weightKg <= 0) return 0;
  const past = drinks.filter((d) => d.hour * 60 + d.minute <= totalMinutes);
  if (past.length === 0) return 0;
  const r = widmarkR(sex);
  let absorbed = 0;
  for (const d of past) {
    const elapsed = totalMinutes - (d.hour * 60 + d.minute);
    absorbed += d.grams * Math.min(1, elapsed / 30);
  }
  const peak = absorbed / (weightKg * r);
  const firstAt = Math.min(...past.map((d) => d.hour * 60 + d.minute));
  const eliminated = ELIMINATION_RATE * Math.max(0, (totalMinutes - firstAt) / 60);
  return Math.max(0, peak - eliminated);
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export const DEFAULT_CONFIG: IntakeConfig = {
  waterGoal: 2000,
  waterStart: "07:30",
  waterEnd: "21:00",
  waterReminderMin: 90,
  caffeineLimit: 400,
  caffeineCutoff: "16:00",
  alcoholDailyLimit: 2,
  alcoholWeeklyLimit: 10,
  bodyWeightKg: 75,
  bodySex: "homme",
  legalLimit: 0.5,
  presets: {
    water: [
      { label: "Verre", amount: 250, icon: "glass-water" },
      { label: "Grand verre", amount: 330, icon: "cup-soda" },
      { label: "Bouteille 50cl", amount: 500, icon: "milk" },
      { label: "Gourde 75cl", amount: 750, icon: "flask-conical" },
      { label: "Litre", amount: 1000, icon: "droplets" },
    ],
    caffeine: [
      { label: "Espresso", amount: 63, icon: "coffee" },
      { label: "Café filtre", amount: 95, icon: "coffee" },
      { label: "Double espresso", amount: 126, icon: "coffee" },
      { label: "Thé noir", amount: 47, icon: "leaf" },
      { label: "Thé vert", amount: 28, icon: "leaf" },
      { label: "Energy drink", amount: 80, icon: "zap" },
      { label: "Soda cola", amount: 34, icon: "cup-soda" },
    ],
    alcohol: [
      { label: "Bière 25cl (5%)", amount: 1, icon: "beer" },
      { label: "Pinte 50cl (5%)", amount: 2, icon: "beer" },
      { label: "Verre de vin 12cl", amount: 1.2, icon: "wine" },
      { label: "Shot 3cl (40%)", amount: 1.2, icon: "martini" },
      { label: "Cocktail", amount: 1.5, icon: "martini" },
    ],
  },
};

export const KIND_META: Record<IntakeKind, { name: string; unit: string; color: string; icon: string; short: string }> = {
  water: { name: "Hydratation", unit: "ml", color: "#38bdf8", icon: "droplets", short: "Eau" },
  caffeine: { name: "Caféine", unit: "mg", color: "#d4af37", icon: "coffee", short: "Caféine" },
  alcohol: { name: "Alcool", unit: "u.", color: "#f87171", icon: "wine", short: "Alcool" },
};

/** Demi-vie de la caféine ≈ 5 h — estime la quantité encore active */
export function caffeineRemaining(
  logs: { amount: number; hour: number; minute: number }[],
  atHour: number,
  atMinute = 0
): number {
  const now = atHour * 60 + atMinute;
  let total = 0;
  for (const l of logs) {
    const t = l.hour * 60 + l.minute;
    if (t > now) continue;
    const hoursSince = (now - t) / 60;
    total += l.amount * Math.pow(0.5, hoursSince / 5);
  }
  return Math.round(total);
}

/** Cadence d'hydratation : combien devrais-je avoir bu à cette heure ? */
export function expectedWaterAt(cfg: IntakeConfig, hour: number, minute = 0): number {
  const [sh, sm] = cfg.waterStart.split(":").map(Number);
  const [eh, em] = cfg.waterEnd.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const now = hour * 60 + minute;
  if (now <= start) return 0;
  if (now >= end) return cfg.waterGoal;
  return Math.round((cfg.waterGoal * (now - start)) / (end - start));
}

export function formatAmount(kind: IntakeKind, amount: number): string {
  if (kind === "water") return amount >= 1000 ? `${(amount / 1000).toFixed(2).replace(/\.?0+$/, "")} L` : `${Math.round(amount)} ml`;
  if (kind === "caffeine") return `${Math.round(amount)} mg`;
  return `${Number(amount.toFixed(1))} u.`;
}
