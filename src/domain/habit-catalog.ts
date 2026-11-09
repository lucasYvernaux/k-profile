import type { HabitCadence } from "./habits";
import type { PillarId } from "./pillars";

export interface HabitTemplate {
  title: string;
  pillar: PillarId;
  cadence: HabitCadence;
}

/**
 * Default unlock queue, ordered to follow the roadmap: phase 1 starts with
 * fixed sleep hours and strength training, the emotion journal comes next
 * (around week 6, once a slot is free), then phase 2 habits.
 * The user can reorder, edit or add habits.
 */
export const DEFAULT_HABIT_QUEUE: readonly HabitTemplate[] = [
  { title: "Lever et coucher à heure fixe", pillar: "body", cadence: { kind: "daily" } },
  { title: "Musculation", pillar: "body", cadence: { kind: "weekly", timesPerWeek: 3 } },
  { title: "Journal du soir (3 émotions)", pillar: "mental", cadence: { kind: "daily" } },
  { title: "Pas d'écran 30 min avant de dormir", pillar: "body", cadence: { kind: "daily" } },
  { title: "Rituel hebdomadaire (famille choisie)", pillar: "family", cadence: { kind: "weekly", timesPerWeek: 1 } },
  { title: "Sport de combat", pillar: "body", cadence: { kind: "weekly", timesPerWeek: 2 } },
  { title: "Échecs 15-20 min", pillar: "strategy", cadence: { kind: "daily" } },
  { title: "Cardio", pillar: "body", cadence: { kind: "weekly", timesPerWeek: 1 } },
  { title: "Prendre des nouvelles d'un proche du cercle des 5", pillar: "family", cadence: { kind: "weekly", timesPerWeek: 1 } },
  { title: "Lecture (stratégie, négociation, influence)", pillar: "strategy", cadence: { kind: "daily" } },
  { title: "Pratique délibérée : compétence du mois", pillar: "maker", cadence: { kind: "weekly", timesPerWeek: 3 } },
  { title: "Atelier maker (électronique, mécanique)", pillar: "maker", cadence: { kind: "weekly", timesPerWeek: 1 } },
  { title: "Exercice d'éloquence", pillar: "presence", cadence: { kind: "weekly", timesPerWeek: 1 } },
];
