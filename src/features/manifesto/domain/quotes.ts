/* ============================================================
   CITATIONS — Bibliothèque de départ
   ============================================================ */

export type QuoteSeed = {
  text: string;
  author: string;
  source?: string;
  category: string;
  /** Personnage dont la maxime incarne la philosophie */
  character?: string;
  /** false = maxime inspirée (non verbatim) */
  isVerbatim?: boolean;
};

export const QUOTE_CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  manifeste: { label: "Manifeste Prométhéen", color: "#f59e0b", icon: "flame" },
  "cote-titres": { label: "COTE — Titres d'épisodes", color: "#8b8cf8", icon: "tv" },
  cote: { label: "Classroom of the Elite", color: "#a78bfa", icon: "graduation-cap" },
  solo: { label: "Solo Leveling", color: "#38bdf8", icon: "swords" },
  arifureta: { label: "Arifureta", color: "#10b981", icon: "hammer" },
  stoique: { label: "Stoïcisme & Philosophie", color: "#d97706", icon: "columns-3" },
  strategie: { label: "Stratégie & Discipline", color: "#f87171", icon: "target" },
  perso: { label: "Personnelles", color: "#e5e5e5", icon: "pen-line" },
};

/** Toutes les graines réunies (manifeste + titres + animes) */
export function allQuoteSeeds(base: { text: string; author: string }[]): QuoteSeed[] {
  const manifeste: QuoteSeed[] = base.map((q) => ({
    text: q.text,
    author: q.author,
    category: /manifeste|nyx|doctrine|white room/i.test(q.author) ? "manifeste" : "stoique",
  }));
  return [...manifeste, ...COTE_EPISODE_QUOTES, ...ANIME_QUOTES];
}

/* ------------------------------------------------------------
   Classroom of the Elite — les titres d'épisodes sont des
   citations de philosophes et d'écrivains. Elles sont ici
   attribuées à leurs auteurs d'origine (domaine public).
   ------------------------------------------------------------ */
export const COTE_EPISODE_QUOTES: QuoteSeed[] = [
  { text: "L'homme se moque de ce qu'il ne comprend pas.", author: "Goethe", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Le monde entier est un théâtre, et tous, hommes et femmes, n'en sont que les acteurs.", author: "William Shakespeare", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Connais-toi toi-même.", author: "Socrate", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Il n'y a qu'un seul bien, le savoir, et qu'un seul mal, l'ignorance.", author: "Socrate", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Je pense, donc je suis.", author: "René Descartes", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'homme n'est qu'un roseau, le plus faible de la nature, mais c'est un roseau pensant.", author: "Blaise Pascal", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'homme est né libre, et partout il est dans les fers.", author: "Jean-Jacques Rousseau", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Celui qui combat des monstres doit prendre garde à ne pas devenir monstre lui-même.", author: "Friedrich Nietzsche", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Quand tu regardes longtemps dans l'abîme, l'abîme regarde aussi en toi.", author: "Friedrich Nietzsche", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Ce qui ne me tue pas me rend plus fort.", author: "Friedrich Nietzsche", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'homme est par nature un animal politique.", author: "Aristote", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'excellence n'est pas un acte, mais une habitude.", author: "Aristote", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Agis seulement d'après la maxime grâce à laquelle tu peux vouloir qu'elle devienne une loi universelle.", author: "Emmanuel Kant", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Le pouvoir tend à corrompre, et le pouvoir absolu corrompt absolument.", author: "Lord Acton", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La fin justifie les moyens.", author: "Nicolas Machiavel", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Il vaut mieux être craint qu'aimé, si l'on ne peut être les deux.", author: "Nicolas Machiavel", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La guerre est la continuation de la politique par d'autres moyens.", author: "Carl von Clausewitz", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'art de la guerre est fondé sur la tromperie.", author: "Sun Tzu", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Connais ton ennemi et connais-toi toi-même ; eussiez-vous cent guerres à soutenir, cent fois vous serez victorieux.", author: "Sun Tzu", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'enfer, c'est les autres.", author: "Jean-Paul Sartre", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'homme est condamné à être libre.", author: "Jean-Paul Sartre", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Le talent se forme dans la solitude, le caractère dans le tumulte du monde.", author: "Goethe", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Rien n'est plus effrayant que l'ignorance en action.", author: "Goethe", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Nul n'est plus désespérément esclave que ceux qui croient faussement être libres.", author: "Goethe", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La vie des hommes est solitaire, misérable, dangereuse, animale et brève.", author: "Thomas Hobbes", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'homme est un loup pour l'homme.", author: "Plaute / Hobbes", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Tout ce que je sais, c'est que je ne sais rien.", author: "Socrate", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La vie non examinée ne vaut pas la peine d'être vécue.", author: "Socrate", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Les grandes âmes ont de la volonté, les faibles n'ont que des souhaits.", author: "Proverbe chinois", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La confiance en soi est le premier secret du succès.", author: "Ralph Waldo Emerson", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Rien de grand ne s'est accompli dans le monde sans passion.", author: "Hegel", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La chouette de Minerve ne prend son envol qu'à la tombée de la nuit.", author: "Hegel", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Les hommes font leur propre histoire, mais ils ne la font pas dans les conditions de leur choix.", author: "Karl Marx", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Le doute est le commencement de la sagesse.", author: "Aristote", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "L'amitié est une âme en deux corps.", author: "Aristote", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Chacun voit midi à sa porte, et c'est pourquoi les hommes se querellent.", author: "Arthur Schopenhauer", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Tout homme prend les limites de son propre champ de vision pour les limites du monde.", author: "Arthur Schopenhauer", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "La solitude est le partage de tous les esprits supérieurs.", author: "Arthur Schopenhauer", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Le cœur a ses raisons que la raison ne connaît point.", author: "Blaise Pascal", source: "Titre d'épisode — COTE", category: "cote-titres" },
  { text: "Tout le malheur des hommes vient d'une seule chose : ne savoir pas demeurer en repos dans une chambre.", author: "Blaise Pascal", source: "Titre d'épisode — COTE", category: "cote-titres" },
];

/* ------------------------------------------------------------
   Maximes THÉMATIQUES inspirées des trois séries.
   Ce ne sont PAS des répliques verbatim : ce sont des principes
   tirés de l'esprit de chaque œuvre, formulés pour le manifeste.
   Utilise le CRUD pour ajouter tes répliques exactes préférées.
   ------------------------------------------------------------ */
export const ANIME_QUOTES: QuoteSeed[] = [
  // ---- Classroom of the Elite ----
  { text: "La victoire appartient à celui qui a préparé le terrain avant que la partie ne commence.", author: "Kiyotaka Ayanokōji", character: "Kiyotaka Ayanokōji", source: "Classroom of the Elite", category: "cote", isVerbatim: false },
  { text: "Les gens ne montrent jamais leur vrai visage ; ils montrent celui qui leur est utile.", author: "Kiyotaka Ayanokōji", character: "Kiyotaka Ayanokōji", source: "Classroom of the Elite", category: "cote", isVerbatim: false },
  { text: "Gagner en restant invisible vaut mieux que triompher sous les projecteurs.", author: "Kiyotaka Ayanokōji", character: "Kiyotaka Ayanokōji", source: "Classroom of the Elite", category: "cote", isVerbatim: false },
  { text: "Ceux qui dépendent des autres pour réussir finissent par dépendre d'eux pour exister.", author: "Suzune Horikita", character: "Suzune Horikita", source: "Classroom of the Elite", category: "cote", isVerbatim: false },
  { text: "Un sourire parfait est l'armure la plus difficile à percer — et la plus lourde à porter.", author: "Kikyō Kushida", character: "Kikyō Kushida", source: "Classroom of the Elite", category: "cote", isVerbatim: false },
  { text: "La méritocratie ne récompense pas l'effort visible, elle récompense le résultat produit.", author: "Manabu Horikita", character: "Manabu Horikita", source: "Classroom of the Elite", category: "cote", isVerbatim: false },
  { text: "Le talent sans stratégie n'est qu'un potentiel qui s'ignore.", author: "Arisu Sakayanagi", character: "Arisu Sakayanagi", source: "Classroom of the Elite", category: "cote", isVerbatim: false },

  // ---- Solo Leveling ----
  { text: "Je ne me suis pas relevé pour être le plus fort, mais parce que personne ne viendrait me relever.", author: "Sung Jin-Woo", character: "Sung Jin-Woo", source: "Solo Leveling", category: "solo", isVerbatim: false },
  { text: "Le plus faible aujourd'hui n'est qu'un point de départ, jamais une sentence.", author: "Sung Jin-Woo", character: "Sung Jin-Woo", source: "Solo Leveling", category: "solo", isVerbatim: false },
  { text: "Chaque épreuve surmontée est un niveau gagné ; chaque niveau gagné rend la suivante possible.", author: "Sung Jin-Woo", character: "Sung Jin-Woo", source: "Solo Leveling", category: "solo", isVerbatim: false },
  { text: "La peur recule quand tu deviens toi-même la chose qu'il faut craindre.", author: "Sung Jin-Woo", character: "Sung Jin-Woo", source: "Solo Leveling", category: "solo", isVerbatim: false },
  { text: "L'ombre n'est pas l'absence de lumière : c'est l'armée que tu rassembles en silence.", author: "Sung Jin-Woo", character: "Sung Jin-Woo", source: "Solo Leveling", category: "solo", isVerbatim: false },
  { text: "Un chasseur se juge à ce qu'il affronte seul, pas au rang qu'on lui a donné.", author: "Cha Hae-In", character: "Cha Hae-In", source: "Solo Leveling", category: "solo", isVerbatim: false },

  // ---- Arifureta ----
  { text: "On ne me donnera rien. Alors je prendrai tout par la force de mes mains.", author: "Hajime Nagumo", character: "Hajime Nagumo", source: "Arifureta", category: "arifureta", isVerbatim: false },
  { text: "Celui qu'on jette dans l'abîme en ressort transformé, ou n'en ressort pas.", author: "Hajime Nagumo", character: "Hajime Nagumo", source: "Arifureta", category: "arifureta", isVerbatim: false },
  { text: "Une aptitude jugée banale devient dévastatrice entre les mains de qui la pousse à l'extrême.", author: "Hajime Nagumo", character: "Hajime Nagumo", source: "Arifureta", category: "arifureta", isVerbatim: false },
  { text: "Transmute ce qui t'a brisé en l'outil qui te rendra inarrêtable.", author: "Hajime Nagumo", character: "Hajime Nagumo", source: "Arifureta", category: "arifureta", isVerbatim: false },
  { text: "La faiblesse n'est pas une nature : c'est un état temporaire qu'on choisit de quitter.", author: "Yue", character: "Yue", source: "Arifureta", category: "arifureta", isVerbatim: false },
  { text: "Le monde ne récompense pas l'élu ; il récompense celui qui refuse de mourir.", author: "Shea Haulia", character: "Shea Haulia", source: "Arifureta", category: "arifureta", isVerbatim: false },
];
