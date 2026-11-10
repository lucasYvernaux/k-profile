import { PILLAR_IDS, PILLARS as K_PILLARS, type PillarId } from "@/domain/pillars";

/* ============================================================
   NYX-KAIROS — Constantes du manifeste & seeds
   ============================================================ */

export type Phase = {
  key: string;
  start: string; // "HH:mm"
  end: string;
  title: string;
  icon: string; // nom d'icône lucide
};

export const PHASES: Phase[] = [
  { key: "lever", start: "07:30", end: "07:45", title: "LEVER — Affirmation de la Volonté", icon: "flame" },
  { key: "meditation-matin", start: "07:45", end: "08:00", title: "Méditation / Visualisation (15 min)", icon: "brain" },
  { key: "deepwork-1", start: "08:00", end: "09:00", title: "Deep Work Session #1 — Étude approfondie (60 min)", icon: "book-open" },
  { key: "forge", start: "09:00", end: "10:00", title: "FORGE CORPORELLE — Entraînement physique", icon: "dumbbell" },
  { key: "douche", start: "10:00", end: "10:15", title: "Douche & Préparation", icon: "shower-head" },
  { key: "petitdej", start: "10:15", end: "10:45", title: "Petit-déjeuner stratégique", icon: "coffee" },
  { key: "logique", start: "10:45", end: "11:15", title: "Raisonnement Logique — Échecs / Puzzles (30 min)", icon: "puzzle" },
  { key: "lecture", start: "11:15", end: "12:15", title: "Lecture approfondie (1h)", icon: "book" },
  { key: "pause-midi", start: "12:15", end: "13:15", title: "Pause & Déjeuner — Récupération", icon: "leaf" },
  { key: "engagement", start: "13:15", end: "14:45", title: "Engagement avec le Monde — Travail / Projets", icon: "swords" },
  { key: "deepwork-2", start: "14:45", end: "16:00", title: "Deep Work Session #2 — Compétence pratique (75 min)", icon: "graduation-cap" },
  { key: "pause-cafe", start: "16:00", end: "16:15", title: "Pause courte", icon: "coffee" },
  { key: "pratique", start: "16:15", end: "17:45", title: "Pratique Active — Créer / Produire", icon: "hammer" },
  { key: "marche", start: "17:45", end: "18:30", title: "Activité physique légère / Marche réflexive", icon: "footprints" },
  { key: "revue", start: "18:30", end: "19:15", title: "Revue de la journée — Active Recall", icon: "bar-chart-3" },
  { key: "diner", start: "19:15", end: "20:00", title: "Dîner", icon: "utensils" },
  { key: "meditation-soir", start: "20:00", end: "20:20", title: "Méditation (10-20 min)", icon: "moon-star" },
  { key: "journal", start: "20:20", end: "21:00", title: "Journal de bord / Analyse émotionnelle", icon: "notebook-pen" },
  { key: "planification", start: "21:00", end: "22:00", title: "Planification du lendemain + Routine du soir", icon: "clipboard-list" },
  { key: "extinction", start: "22:00", end: "23:59", title: "EXTINCTION — Sommeil", icon: "moon" },
];

/** Jours ouvrés : lundi → samedi */
export const WEEKDAYS_MON_SAT = [1, 2, 3, 4, 5, 6];
/** Dimanche seul */
export const SUNDAY_ONLY = [0];

/**
 * Routine du DIMANCHE — « Réflexion & Préparation » (cycle hebdomadaire du manifeste).
 * Réveil plus tardif, bilan hebdomadaire, cercle intime, préparation de la semaine.
 */
export const SUNDAY_PHASES: Phase[] = [
  { key: "dim-eveil", start: "08:30", end: "08:45", title: "ÉVEIL LENT — Récupération assumée", icon: "sunrise" },
  { key: "dim-meditation", start: "08:45", end: "09:15", title: "Méditation longue / Visualisation de la semaine", icon: "brain" },
  { key: "dim-petitdej", start: "09:15", end: "10:00", title: "Petit-déjeuner & lecture légère", icon: "coffee" },
  { key: "dim-bilan", start: "10:00", end: "11:00", title: "RAPPORT DE GUERRE — Bilan de la semaine", icon: "bar-chart-3" },
  { key: "dim-planification", start: "11:00", end: "12:00", title: "Planification stratégique de la semaine", icon: "clipboard-list" },
  { key: "dim-dejeuner", start: "12:00", end: "13:30", title: "Déjeuner & Conseil des Ombres (cercle intime)", icon: "users" },
  { key: "dim-regeneration", start: "13:30", end: "15:00", title: "Régénération — Loisir choisi, sans culpabilité", icon: "leaf" },
  { key: "dim-lecture", start: "15:00", end: "16:30", title: "Lecture approfondie (90 min)", icon: "book" },
  { key: "dim-marche", start: "16:30", end: "17:30", title: "Marche réflexive / Nature", icon: "footprints" },
  { key: "dim-logistique", start: "17:30", end: "18:30", title: "Tour de Contrôle — Cycles domestiques & logistique", icon: "radar" },
  { key: "dim-diner", start: "18:30", end: "19:30", title: "Dîner", icon: "utensils" },
  { key: "dim-cercle", start: "19:30", end: "20:30", title: "Temps avec le cercle / Déconnexion", icon: "heart" },
  { key: "dim-journal", start: "20:30", end: "21:15", title: "Journal de bord & revue des 6 piliers", icon: "notebook-pen" },
  { key: "dim-soir", start: "21:15", end: "22:00", title: "Routine du soir — Lecture calme", icon: "moon-star" },
  { key: "dim-extinction", start: "22:00", end: "23:59", title: "EXTINCTION — Sommeil", icon: "moon" },
];

export type Pillar = {
  key: PillarId;
  name: string;
  short: string;
  icon: string;
  color: string; // hex, at least 4.5:1 on the darkest and lightest nyx surfaces
  description: string;
};

/**
 * Display data for the six pillars of K (names and summaries come from
 * src/domain/pillars.ts). Colours were checked on the dark "life" surfaces.
 * NYX-KAIROS pillars were mapped onto them (ADR 0010): forge → body,
 * académie + artisanat → maker, conseil → family, économie → strategy,
 * gouvernement → mental.
 */
const PILLAR_STYLE: Record<PillarId, Pick<Pillar, "short" | "icon" | "color">> = {
  mental: { short: "Mental", icon: "eye", color: "#8b8cf8" },
  body: { short: "Corps", icon: "dumbbell", color: "#f87171" },
  maker: { short: "Maker", icon: "hammer", color: "#d4af37" },
  strategy: { short: "Stratégie", icon: "coins", color: "#10b981" },
  family: { short: "Famille", icon: "users", color: "#a78bfa" },
  presence: { short: "Présence", icon: "sparkles", color: "#38bdf8" },
};

export const PILLARS: Pillar[] = PILLAR_IDS.map((key) => ({
  key,
  name: K_PILLARS[key].name,
  description: K_PILLARS[key].summary,
  ...PILLAR_STYLE[key],
}));

/** NYX-KAIROS pillar keys → K pillars (data migration and old backups). */
export const NYX_PILLAR_TO_K: Record<string, PillarId> = {
  forge: "body",
  academie: "maker",
  artisanat: "maker",
  conseil: "family",
  economie: "strategy",
  gouvernement: "mental",
};

export const PILLAR_MAP: Record<string, Pillar> = Object.fromEntries(PILLARS.map((p) => [p.key, p]));

export const GOAL_LEVELS = [
  { level: 1, name: "Survie & Autonomie", desc: "Stabiliser la base : santé, finances, discipline." },
  { level: 2, name: "Excellence & Maîtrise", desc: "Devenir redoutable dans un domaine choisi." },
  { level: 3, name: "Influence & Création", desc: "Créer de la valeur, élargir le cercle d'influence." },
  { level: 4, name: "Légende & Héritage", desc: "Construire ce qui survivra à l'individu." },
  { level: 5, name: "Évolution & Transcendance", desc: "Dépasser la forme actuelle de soi-même." },
];

export const PLAYER_TITLES = [
  { min: 1, max: 10, name: "Éveillé", subtitle: "Survie et Autonomie" },
  { min: 11, max: 25, name: "Apprenti Architecte", subtitle: "Excellence et Maîtrise" },
  { min: 26, max: 50, name: "Forgeron de l'Ombre", subtitle: "Influence et Création" },
  { min: 51, max: 75, name: "Architecte Souverain", subtitle: "Légende et Héritage" },
  { min: 76, max: 100, name: "Prométhéen", subtitle: "Évolution et Transcendance" },
];

// XP cumulé requis pour atteindre le niveau n : 40 * (n-1)^2
export function xpForLevel(n: number): number {
  return 40 * Math.pow(n - 1, 2);
}
export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (lvl < 100 && xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}
export function titleForLevel(level: number) {
  return PLAYER_TITLES.find((t) => level >= t.min && level <= t.max) ?? PLAYER_TITLES[0];
}

export const INTERDITS = [
  "Se plaindre",
  "Chercher des excuses",
  "Se comparer aux autres",
  "Procrastiner l'essentiel",
  "Laisser l'émotion décider",
  "Consommer sans créer",
  "Se mentir à soi-même",
];

export const PIEGES = [
  "Le confort déguisé en repos",
  "Le perfectionnisme paralysant",
  "La planification sans exécution",
  "L'illusion du multitâche",
  "La soif de validation externe",
  "L'optimisation stérile",
  "L'isolement total",
  "Le burn-out glorifié",
];

export const QUOTES: { text: string; author: string }[] = [
  { text: "Le talent n'est rien sans la volonté de le forger chaque jour.", author: "Manifeste Prométhéen" },
  { text: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", author: "Sénèque" },
  { text: "Tu as pouvoir sur ton esprit, non sur les événements extérieurs. Réalise cela, et tu trouveras la force.", author: "Marc Aurèle" },
  { text: "Jamais je ne suis battu. Mon adversaire gagne simplement jusqu'à ce que je trouve la faille.", author: "Ayanokoji Kiyotaka" },
  { text: "Tout le monde a un plan, jusqu'au premier coup de poing en pleine figure.", author: "Mike Tyson" },
  { text: "Parfois il faut courir avant de savoir marcher.", author: "Tony Stark" },
  { text: "Le génie, c'est 1% d'inspiration et 99% de transpiration.", author: "Thomas Edison" },
  { text: "Celui qui déplace des montagnes commence par déplacer de petites pierres.", author: "Confucius" },
  { text: "L'homme qui se connaît lui-même n'a point d'adversaire.", author: "Sun Tzu (adapté)" },
  { text: "La discipline est le pont entre les objectifs et l'accomplissement.", author: "Jim Rohn" },
  { text: "Devient ce que tu es.", author: "Friedrich Nietzsche" },
  { text: "On ne peut rien contre un homme qui refuse de mourir.", author: "White Room Doctrine" },
  { text: "Le feu qui brûle le bois est le même qui forge l'acier. Tout dépend de ce que tu es.", author: "Manifeste Prométhéen" },
  { text: "Ne compte pas les jours, fais que les jours comptent.", author: "Muhammad Ali" },
  { text: "L'excellence n'est pas un acte, mais une habitude.", author: "Aristote" },
  { text: "Ce qui ne me tue pas me rend plus fort.", author: "Friedrich Nietzsche" },
  { text: "L'émotion est une information, jamais un ordre.", author: "Doctrine Nyx" },
  { text: "Un plan imparfait exécuté aujourd'hui vaut mieux qu'un plan parfait exécuté jamais.", author: "Doctrine Kairos" },
  { text: "La liberté est le fruit de la discipline.", author: "Manifeste Prométhéen" },
  { text: "Sois si bon qu'ils ne puissent pas t'ignorer.", author: "Steve Martin" },
  { text: "Aucun vent n'est favorable pour celui qui ne sait où il va.", author: "Sénèque" },
  { text: "Nous souffrons plus dans notre imagination que dans la réalité.", author: "Sénèque" },
  { text: "Le calme est une superpuissance.", author: "Doctrine du Gouvernement de l'Ombre" },
  { text: "Construis en silence. Laisse le résultat faire le bruit.", author: "Doctrine Nyx-Kairos" },
];

/* ------------------------------------------------------------
   Timers domestiques par défaut
   ------------------------------------------------------------ */
export type TimerSeed = { name: string; icon: string; category: string; frequencyDays: number; description?: string };

export const DEFAULT_TIMERS: TimerSeed[] = [
  // LITERIE & LINGE
  { name: "Changer les draps", icon: "bed-double", category: "literie", frequencyDays: 7 },
  { name: "Changer les taies d'oreiller", icon: "bed", category: "literie", frequencyDays: 4 },
  { name: "Laver les serviettes", icon: "washing-machine", category: "literie", frequencyDays: 3 },
  { name: "Laver la couette", icon: "bed-double", category: "literie", frequencyDays: 30 },
  { name: "Retourner le matelas", icon: "repeat", category: "literie", frequencyDays: 90 },
  // MÉNAGE
  { name: "Passer l'aspirateur", icon: "wind", category: "menage", frequencyDays: 3 },
  { name: "Laver le sol", icon: "brush", category: "menage", frequencyDays: 7 },
  { name: "Nettoyer la salle de bain", icon: "shower-head", category: "menage", frequencyDays: 7 },
  { name: "Nettoyer les toilettes", icon: "spray-can", category: "menage", frequencyDays: 3 },
  { name: "Nettoyer la cuisine (profond)", icon: "chef-hat", category: "menage", frequencyDays: 7 },
  { name: "Dépoussiérer", icon: "sparkles", category: "menage", frequencyDays: 7 },
  { name: "Nettoyer le frigo", icon: "refrigerator", category: "menage", frequencyDays: 14 },
  { name: "Nettoyer le four", icon: "flame", category: "menage", frequencyDays: 30 },
  { name: "Nettoyer les vitres", icon: "square", category: "menage", frequencyDays: 30 },
  { name: "Laver les rideaux", icon: "blinds", category: "menage", frequencyDays: 90 },
  // POUBELLES
  { name: "Sortir les poubelles ménagères", icon: "trash-2", category: "poubelles", frequencyDays: 2 },
  { name: "Poubelle tri sélectif", icon: "recycle", category: "poubelles", frequencyDays: 7 },
  { name: "Poubelle verre", icon: "milk", category: "poubelles", frequencyDays: 14 },
  { name: "Vider les petites poubelles (SDB, bureau)", icon: "trash", category: "poubelles", frequencyDays: 3 },
  // ENTRETIEN PERSONNEL
  { name: "Couper les cheveux / coiffeur", icon: "scissors", category: "personnel", frequencyDays: 28 },
  { name: "Couper les ongles des mains", icon: "hand", category: "personnel", frequencyDays: 7 },
  { name: "Couper les ongles des pieds", icon: "footprints", category: "personnel", frequencyDays: 14 },
  { name: "Changer la brosse à dents", icon: "replace", category: "personnel", frequencyDays: 90 },
  { name: "Contrôle dentiste", icon: "stethoscope", category: "personnel", frequencyDays: 180 },
  { name: "Contrôle médical général", icon: "heart-pulse", category: "personnel", frequencyDays: 365 },
  { name: "Contrôle ophtalmologue", icon: "glasses", category: "personnel", frequencyDays: 365 },
  { name: "Dermatologue", icon: "scan-face", category: "personnel", frequencyDays: 365 },
  // MAISON / VÉHICULE
  { name: "Vérifier les détecteurs de fumée", icon: "siren", category: "vehicule", frequencyDays: 30 },
  { name: "Nettoyer les filtres climatisation", icon: "air-vent", category: "vehicule", frequencyDays: 90 },
  { name: "Vidange voiture", icon: "car", category: "vehicule", frequencyDays: 180, description: "Selon kilométrage — timer de secours." },
  { name: "Contrôle technique", icon: "clipboard-check", category: "vehicule", frequencyDays: 730 },
  { name: "Vérifier pression pneus", icon: "gauge", category: "vehicule", frequencyDays: 30 },
  // ADMINISTRATIF
  { name: "Vérifier les comptes bancaires", icon: "landmark", category: "administratif", frequencyDays: 7 },
  { name: "Budget mensuel", icon: "wallet", category: "administratif", frequencyDays: 30 },
  { name: "Déclaration d'impôts", icon: "file-text", category: "administratif", frequencyDays: 365, description: "Rappel 30 jours avant recommandé." },
  { name: "Revue des abonnements / contrats", icon: "file-signature", category: "administratif", frequencyDays: 90 },
  // SOCIAL / CERCLE
  { name: "Contacter un membre du cercle", icon: "phone", category: "cercle", frequencyDays: 10, description: "Personnalisable par personne." },
  { name: "Organiser un moment avec le cercle", icon: "users", category: "cercle", frequencyDays: 14 },
];

export const TIMER_CATEGORIES: Record<string, string> = {
  literie: "Literie & Linge",
  menage: "Ménage",
  poubelles: "Poubelles",
  personnel: "Entretien personnel",
  vehicule: "Maison / Véhicule",
  administratif: "Administratif",
  cercle: "Social / Cercle intime",
  maison: "Maison",
  autre: "Autre",
};

/* ------------------------------------------------------------
   Achievements (optional gamification, off by default — ADR 0010).
   Evaluated from K habits, routine phases, workouts, network contacts,
   logbook and upkeep timers.
   ------------------------------------------------------------ */
export const DEFAULT_ACHIEVEMENTS = [
  { code: "premier_feu", name: "Premier Feu", description: "Premier jour à 100 %.", icon: "flame" },
  { code: "semaine_fer", name: "Semaine de Fer", description: "7 jours consécutifs ≥ 80 %.", icon: "shield" },
  { code: "mois_acier", name: "Mois d'Acier", description: "30 jours consécutifs ≥ 70 %.", icon: "gem" },
  { code: "maitre_aube", name: "Maître de l'Aube", description: "30 phases « Lever » validées d'affilée.", icon: "sunrise" },
  { code: "esprit_aiguise", name: "L'Esprit Aiguisé", description: "30 sessions de Deep Work validées d'affilée.", icon: "zap" },
  { code: "temple", name: "Le Temple", description: "30 séances de sport sur 30 jours.", icon: "dumbbell" },
  { code: "stoicien", name: "Le Stoïcien", description: "30 jours de méditation d'affilée.", icon: "brain" },
  { code: "artisan", name: "L'Artisan", description: "1 projet phare complété.", icon: "hammer" },
  { code: "conseil", name: "Le Conseil", description: "4 semaines avec un contact du cercle intime.", icon: "users" },
  { code: "scribe", name: "Le Scribe", description: "7 journaux de bord complétés.", icon: "notebook-pen" },
  { code: "horloger", name: "L'Horloger", description: "10 tâches d'entretien traitées.", icon: "timer" },
];

export const EMOTIONS = [
  "Colère", "Frustration", "Anxiété", "Fierté", "Joie", "Tristesse",
  "Ennui", "Honte", "Peur", "Sérénité", "Excitation", "Doute", "Gratitude", "Détermination",
];
