/**
 * Every figure the app shows must come from here, with its source.
 * Brief, section 9: "Ne pas présenter de chiffre scientifique sans source."
 */

export interface Source {
  id: string;
  citation: string;
  url: string;
}

export const SOURCES = {
  lally2010: {
    id: "lally2010",
    citation:
      "Lally, van Jaarsveld, Potts & Wardle (2010), European Journal of Social Psychology, doi:10.1002/ejsp.674",
    url: "https://doi.org/10.1002/ejsp.674",
  },
  lally2010Digest: {
    id: "lally2010Digest",
    citation: "Christian Jarrett, BPS Research Digest, 6 octobre 2010",
    url: "https://www.bps.org.uk/research-digest/how-form-habit",
  },
  roberts2017: {
    id: "roberts2017",
    citation: "Roberts, Luo, Briley, Chow, Su & Hill (2017), Psychological Bulletin, 143(2), 117-141, doi:10.1037/bul0000088",
    url: "https://doi.org/10.1037/bul0000088",
  },
  hudson2018: {
    id: "hudson2018",
    citation: "Hudson, Briley, Chopik & Derringer (2019, en ligne 2018), Journal of Personality and Social Psychology, 117(4), doi:10.1037/pspp0000221",
    url: "https://doi.org/10.1037/pspp0000221",
  },
  lieberman2007: {
    id: "lieberman2007",
    citation: "Lieberman et al. (2007), Psychological Science, doi:10.1111/j.1467-9280.2007.01916.x",
    url: "https://doi.org/10.1111/j.1467-9280.2007.01916.x",
  },
  who2020: {
    id: "who2020",
    citation:
      "OMS (2020), Lignes directrices sur l'activité physique et la sédentarité : en un coup d'œil",
    url: "https://www.who.int/europe/fr/publications/i/item/9789240014886",
  },
  spfAlcohol: {
    id: "spfAlcohol",
    citation: "Santé publique France et INCa, repères de consommation d'alcool",
    url: "https://www.santepubliquefrance.fr/presse/alcool-et-sante-ameliorer-les-connaissances-et-reduire-les-risques",
  },
  microThresholds2026: {
    id: "microThresholds2026",
    citation: "Samuel Hayot, Hayot Expertise, mis à jour le 8 juin 2026",
    url: "https://hayot-expertise.fr/blog/plafonds-micro-entreprise-2026-chiffres-bascule-tva",
  },
  suicidePrevention: {
    id: "suicidePrevention",
    citation: "Ministère de la Santé, que faire face à une crise suicidaire",
    url: "https://sante.gouv.fr/prevention-en-sante/sante-mentale/promotion-et-prevention/la-prevention-du-suicide/article/que-faire-et-a-qui-s-adresser-face-a-une-crise-suicidaire",
  },
  ipip: {
    id: "ipip",
    citation: "International Personality Item Pool (domaine public)",
    url: "https://ipip.ori.org/",
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Personality change through intervention (Roberts et al., 2017, abstract). */
export const PERSONALITY_CHANGE = {
  averageInterventionWeeks: 24,
  studies: 207,
  source: SOURCES.roberts2017,
} as const;

/** Habit formation figures (Lally et al., 2010, via the BPS digest). */
export const HABIT_FORMATION = {
  medianDays: 66,
  minDays: 18,
  /** Extrapolated: the study itself lasted 84 days. */
  maxPredictedDays: 254,
  exerciseSlowdownFactor: 1.5,
  sources: [SOURCES.lally2010, SOURCES.lally2010Digest],
} as const;

/** Low-risk drinking guidelines (Santé publique France / INCa). */
export const ALCOHOL_GUIDELINES = {
  maxDrinksPerWeek: 10,
  maxDrinksPerDay: 2,
  source: SOURCES.spfAlcohol,
} as const;

/** WHO adult aerobic activity guideline. */
export const ACTIVITY_GUIDELINES = {
  minModerateMinutesPerWeek: 150,
  maxModerateMinutesPerWeek: 300,
  source: SOURCES.who2020,
} as const;
