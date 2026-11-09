import { addDays, addMonths, daysBetween, type DayKey } from "./dates";

/** Roadmap phases (product brief, section 5). */
export const PHASE_IDS = [
  "audit",
  "foundations",
  "identity",
  "expansion",
  "mastery",
  "leverage",
  "embodiment",
] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export interface PhaseDefinition {
  id: PhaseId;
  number: number;
  name: string;
  durationLabel: string;
  /** Start and end offsets in months after the audit; null for the audit itself. */
  monthRange: [number, number] | null;
  milestones: string[];
}

export const AUDIT_DURATION_DAYS = 14;

export const PHASES: readonly PhaseDefinition[] = [
  {
    id: "audit",
    number: 0,
    name: "Audit",
    durationLabel: "2 semaines",
    monthRange: null,
    milestones: [
      "Passer un test Big Five (IPIP) et saisir les scores",
      "Mesures physiques de départ",
      "CA des 12 derniers mois, taux journalier, part du plus gros client",
      "Épargne et dépenses mensuelles",
      "Liste des proches",
      "Consommation d'alcool, temps d'écran, heures de travail",
    ],
  },
  {
    id: "foundations",
    number: 1,
    name: "Fondations",
    durationLabel: "Mois 1 à 3",
    monthRange: [0, 3],
    milestones: [
      "Lever et coucher à heure fixe",
      "Musculation 3 fois par semaine",
      "Journal des émotions lancé (vers la semaine 6)",
      "Niche choisie et grille tarifaire revue",
      "Premier rituel hebdomadaire organisé",
    ],
  },
  {
    id: "identity",
    number: 2,
    name: "Identité",
    durationLabel: "Mois 4 à 6",
    monthRange: [3, 6],
    milestones: [
      "Inscription dans un club de sport de combat",
      "Échecs : classement suivi",
      "Premier projet trimestriel livré",
      "Deuxième test Big Five",
    ],
  },
  {
    id: "expansion",
    number: 3,
    name: "Expansion",
    durationLabel: "Mois 7 à 12",
    monthRange: [6, 12],
    milestones: [
      "Premier montage électronique (Arduino/ESP32 ou impression 3D)",
      "6 livres lus",
      "Inscription dans un club d'éloquence",
      "Hausse du taux journalier appliquée",
      "3 mois de dépenses en épargne de sécurité",
      "Bilan annuel",
    ],
  },
  {
    id: "mastery",
    number: 4,
    name: "Maîtrise",
    durationLabel: "Année 2",
    monthRange: [12, 24],
    milestones: [
      "Bases de mécanique automobile",
      "Produit ou SaaS lancé",
      "Mentorat d'un junior",
      "Premier talk public",
    ],
  },
  {
    id: "leverage",
    number: 5,
    name: "Levier",
    durationLabel: "Année 3",
    monthRange: [24, 36],
    milestones: [
      "Revenus hors temps facturé",
      "Restauration du véhicule ancien engagée",
      "Réflexion société et équipe",
    ],
  },
  {
    id: "embodiment",
    number: 6,
    name: "Incarnation",
    durationLabel: "Années 4 et 5",
    monthRange: [36, 60],
    milestones: ["Consolidation des six piliers", "Bilan des cinq ans"],
  },
];

export interface PhaseWindow {
  phase: PhaseDefinition;
  start: DayKey;
  /** Inclusive last day. */
  end: DayKey;
}

/** Computes the calendar window of each phase from the program start date. */
export function phaseWindows(programStart: DayKey): PhaseWindow[] {
  const foundationsStart = addDays(programStart, AUDIT_DURATION_DAYS);
  return PHASES.map((phase) => {
    if (!phase.monthRange) {
      return { phase, start: programStart, end: addDays(foundationsStart, -1) };
    }
    const [fromMonth, toMonth] = phase.monthRange;
    return {
      phase,
      start: addMonths(foundationsStart, fromMonth),
      end: addDays(addMonths(foundationsStart, toMonth), -1),
    };
  });
}

export interface PhaseProgress {
  window: PhaseWindow;
  /** Share of the phase duration already elapsed, between 0 and 1. */
  timeElapsed: number;
  status: "upcoming" | "current" | "past";
}

/** Current phase, or the last one when the five-year program is over. */
export function currentPhase(programStart: DayKey, today: DayKey): PhaseProgress {
  const windows = phaseWindows(programStart);
  const window =
    windows.find((candidate) => today >= candidate.start && today <= candidate.end) ??
    (today < programStart ? windows[0] : windows[windows.length - 1]);
  return phaseProgress(window, today);
}

export function phaseProgress(window: PhaseWindow, today: DayKey): PhaseProgress {
  if (today < window.start) {
    return { window, timeElapsed: 0, status: "upcoming" };
  }
  if (today > window.end) {
    return { window, timeElapsed: 1, status: "past" };
  }
  const total = daysBetween(window.start, window.end) + 1;
  const elapsed = daysBetween(window.start, today) + 1;
  return { window, timeElapsed: elapsed / total, status: "current" };
}

export function milestoneCompletion(milestones: readonly { done: boolean }[]): number {
  if (milestones.length === 0) {
    return 0;
  }
  return milestones.filter((milestone) => milestone.done).length / milestones.length;
}
