/** The six pillars of the K profile (product brief, section 3). */

export const PILLAR_IDS = [
  "mental",
  "body",
  "maker",
  "strategy",
  "family",
  "presence",
] as const;

export type PillarId = (typeof PILLAR_IDS)[number];

export interface Pillar {
  id: PillarId;
  name: string;
  inspiredBy: string;
  summary: string;
  /** Healthy rules shown on the pillar card. They are not tracked habits. */
  rules: string[];
}

export const PILLARS: Record<PillarId, Pillar> = {
  mental: {
    id: "mental",
    name: "Maîtrise émotionnelle",
    inspiredBy: "Ayanokōji, Lucifer",
    summary: "Calme sous pression, émotions nommées, franchise choisie.",
    rules: [
      "Réponse différée : attendre 24 h avant de répondre par écrit à un conflit.",
      "Ne jamais mentir, mais choisir ce que l'on dit.",
      "Un suivi psychologique est une ressource, pas un aveu de faiblesse.",
    ],
  },
  body: {
    id: "body",
    name: "Corps",
    inspiredBy: "Nagumo, Toretto",
    summary: "Force, combat encadré, sommeil protégé.",
    rules: [
      "Heures de lever et de coucher fixes.",
      "Pas d'écran 30 minutes avant de dormir.",
      "La colère se canalise dans un sport de combat encadré.",
    ],
  },
  maker: {
    id: "maker",
    name: "Maker",
    inspiredBy: "Stark, Nagumo",
    summary: "Construire, livrer, apprendre par la pratique délibérée.",
    rules: [
      "Un projet personnel livré par trimestre.",
      "Une compétence ciblée par mois.",
      "Déléguer plutôt que sacrifier son sommeil.",
    ],
  },
  strategy: {
    id: "strategy",
    name: "Stratégie, business, argent",
    inspiredBy: "Stark, Ayanokōji",
    summary: "Penser plusieurs coups à l'avance, sécuriser ses finances.",
    rules: [
      "Influencer de façon éthique, jamais manipuler.",
      "Épargner automatiquement à chaque encaissement.",
    ],
  },
  family: {
    id: "family",
    name: "Famille choisie",
    inspiredBy: "Toretto",
    summary: "Loyauté, rituels, cercle proche entretenu.",
    rules: [
      "Un rituel hebdomadaire fixe, même jour, 4 à 6 personnes.",
      "Prendre de vraies nouvelles du cercle des 5 au moins une fois par mois.",
      "Des limites claires et une seconde chance conditionnelle.",
    ],
  },
  presence: {
    id: "presence",
    name: "Présence et style",
    inspiredBy: "Lucifer",
    summary: "Franchise, écoute active, prise de parole, plaisir cadré.",
    rules: [
      "Écouter pour comprendre avant de répondre.",
      "Une garde-robe réduite mais de qualité.",
      "Le plaisir est assumé mais cadré.",
    ],
  },
};

export function isPillarId(value: unknown): value is PillarId {
  return typeof value === "string" && (PILLAR_IDS as readonly string[]).includes(value);
}
