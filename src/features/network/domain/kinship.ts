/*
 * Kinship model: link kinds between two people and the relationship words
 * ("mère", "oncle", "cousine germaine", "belle-sœur"…) derived from them.
 * Pure functions, shared by the client and the server. See docs/adr/0009-kinship-links-and-family-tree.md.
 */

export type Gender = "homme" | "femme" | "autre";

export const GENDERS: Record<Gender, string> = { homme: "Homme", femme: "Femme", autre: "Autre / non précisé" };

/** A word in its neutral, masculine and feminine forms. */
type Word = readonly [neutral: string, masculine: string, feminine: string];

export function wordFor(word: Word, gender: string | null | undefined): string {
  if (gender === "homme") return word[1];
  if (gender === "femme") return word[2];
  return word[0];
}

/**
 * A kinship path is a sequence of steps from one person to another:
 *   U = up to a parent, D = down to a child, P = to a partner, X = to an ex-partner.
 * "UD" is a sibling, "UUDD" a first cousin, "PU" a parent-in-law…
 */
export type Step = "U" | "D" | "P" | "X";

export type LinkGroup = "famille" | "couple" | "social";

export type LinkKind = {
  label: string;
  group: LinkGroup;
  color: string;
  dash?: string;
  /** Directed kinds: role of aId (the upper role) and of bId. */
  up?: Word;
  down?: Word;
  /** Symmetric kinds: role of both ends. */
  role?: Word;
  /** Path from aId to bId; omitted when the kind says nothing about the family structure. */
  path?: readonly Step[];
  /** Generations between aId and bId (aId above). 0 = same generation. */
  generations?: number;
  /** Shown in the family tree. */
  inTree?: boolean;
};

const FAMILY = "#d4af37";
const STEP = "#a8862a";
const COUPLE = "#f87171";

export const LINK_KINDS: Record<string, LinkKind> = {
  // — Famille : ascendants / descendants (orientés : a est au-dessus de b)
  parent: { label: "Parent / enfant", group: "famille", color: FAMILY, up: ["Parent", "Père", "Mère"], down: ["Enfant", "Fils", "Fille"], path: ["D"], generations: 1, inTree: true },
  parent_adoptif: { label: "Parent adoptif", group: "famille", color: FAMILY, dash: "6 3", up: ["Parent adoptif", "Père adoptif", "Mère adoptive"], down: ["Enfant adopté", "Fils adoptif", "Fille adoptive"], path: ["D"], generations: 1, inTree: true },
  beau_parent: { label: "Beau-parent (famille recomposée)", group: "famille", color: STEP, dash: "6 3", up: ["Beau-parent", "Beau-père", "Belle-mère"], down: ["Bel enfant", "Beau-fils", "Belle-fille"], path: ["P", "D"], generations: 1, inTree: true },
  grand_parent: { label: "Grand-parent", group: "famille", color: FAMILY, dash: "2 4", up: ["Grand-parent", "Grand-père", "Grand-mère"], down: ["Petit-enfant", "Petit-fils", "Petite-fille"], path: ["D", "D"], generations: 2, inTree: true },
  arriere_grand_parent: { label: "Arrière-grand-parent", group: "famille", color: FAMILY, dash: "2 4", up: ["Arrière-grand-parent", "Arrière-grand-père", "Arrière-grand-mère"], down: ["Arrière-petit-enfant", "Arrière-petit-fils", "Arrière-petite-fille"], path: ["D", "D", "D"], generations: 3, inTree: true },
  oncle_tante: { label: "Oncle / tante", group: "famille", color: FAMILY, dash: "2 4", up: ["Oncle / tante", "Oncle", "Tante"], down: ["Neveu / nièce", "Neveu", "Nièce"], path: ["U", "D", "D"], generations: 1, inTree: true },
  grand_oncle: { label: "Grand-oncle / grand-tante", group: "famille", color: FAMILY, dash: "2 4", up: ["Grand-oncle / grand-tante", "Grand-oncle", "Grand-tante"], down: ["Petit-neveu / petite-nièce", "Petit-neveu", "Petite-nièce"], path: ["U", "D", "D", "D"], generations: 2, inTree: true },
  parrain: { label: "Parrain / marraine", group: "famille", color: "#eab308", dash: "1 3", up: ["Parrain / marraine", "Parrain", "Marraine"], down: ["Filleul·e", "Filleul", "Filleule"] },
  // — Famille : même génération
  fratrie: { label: "Frère / sœur", group: "famille", color: FAMILY, role: ["Frère / sœur", "Frère", "Sœur"], path: ["U", "D"], generations: 0, inTree: true },
  demi_fratrie: { label: "Demi-frère / demi-sœur", group: "famille", color: FAMILY, dash: "6 3", role: ["Demi-frère / demi-sœur", "Demi-frère", "Demi-sœur"], path: ["U", "D"], generations: 0, inTree: true },
  quasi_fratrie: { label: "Frère / sœur par alliance", group: "famille", color: STEP, dash: "6 3", role: ["Quasi-frère / quasi-sœur", "Quasi-frère", "Quasi-sœur"], path: ["U", "P", "D"], generations: 0, inTree: true },
  cousin: { label: "Cousin·e", group: "famille", color: FAMILY, dash: "2 4", role: ["Cousin·e", "Cousin", "Cousine"], path: ["U", "U", "D", "D"], generations: 0, inTree: true },
  beau_frere: { label: "Beau-frère / belle-sœur", group: "famille", color: STEP, dash: "2 4", role: ["Beau-frère / belle-sœur", "Beau-frère", "Belle-sœur"], path: ["U", "D", "P"], generations: 0, inTree: true },
  famille: { label: "Famille (autre)", group: "famille", color: FAMILY, dash: "1 3", role: ["Famille", "Famille", "Famille"], inTree: true },
  // — Couple (même génération)
  marie: { label: "Marié·e", group: "couple", color: COUPLE, role: ["Époux / épouse", "Époux", "Épouse"], path: ["P"], generations: 0, inTree: true },
  pacse: { label: "Pacsé·e", group: "couple", color: COUPLE, role: ["Partenaire de PACS", "Partenaire de PACS", "Partenaire de PACS"], path: ["P"], generations: 0, inTree: true },
  couple: { label: "En couple", group: "couple", color: COUPLE, role: ["Compagnon / compagne", "Compagnon", "Compagne"], path: ["P"], generations: 0, inTree: true },
  fiance: { label: "Fiancé·e", group: "couple", color: COUPLE, role: ["Fiancé·e", "Fiancé", "Fiancée"], path: ["P"], generations: 0, inTree: true },
  ex: { label: "Ex", group: "couple", color: "#9f1239", dash: "4 4", role: ["Ex", "Ex", "Ex"], path: ["X"], generations: 0, inTree: true },
  // — Social
  meilleur_ami: { label: "Meilleurs amis", group: "social", color: "#38bdf8", role: ["Meilleur·e ami·e", "Meilleur ami", "Meilleure amie"] },
  amis: { label: "Amis", group: "social", color: "#38bdf8", role: ["Ami·e", "Ami", "Amie"] },
  collegues: { label: "Collègues", group: "social", color: "#10b981", role: ["Collègue", "Collègue", "Collègue"] },
  camarades: { label: "Camarades (études)", group: "social", color: "#22d3ee", role: ["Camarade", "Camarade", "Camarade"] },
  colocataires: { label: "Colocataires", group: "social", color: "#a78bfa", role: ["Colocataire", "Colocataire", "Colocataire"] },
  voisins: { label: "Voisins", group: "social", color: "#84cc16", role: ["Voisin·e", "Voisin", "Voisine"] },
  mentor: { label: "Mentor / élève", group: "social", color: "#c084fc", up: ["Mentor", "Mentor", "Mentore"], down: ["Élève", "Élève", "Élève"] },
  connaissances: { label: "Se connaissent", group: "social", color: "#a0a0a0", dash: "4 4", role: ["Connaissance", "Connaissance", "Connaissance"] },
  tension: { label: "Tension", group: "social", color: "#f97316", dash: "2 4", role: ["En tension", "En tension", "En tension"] },
};

export const LINK_GROUPS: Record<LinkGroup, string> = { famille: "Famille", couple: "Couple", social: "Social" };

export const linkKind = (kind: string): LinkKind => LINK_KINDS[kind] ?? LINK_KINDS.amis;

export const isDirected = (kind: string) => Boolean(linkKind(kind).up);

/** Kinds that place two people on different generations (aId above bId). */
export const isAncestry = (kind: string) => (linkKind(kind).generations ?? 0) > 0;

export type KinLink = { id?: number; aId: number; bId: number; kind: string; label?: string | null };

/** Role that `otherId` plays for `selfId` in this link ("Mère", "Cousin"…). */
export function roleInLink(link: KinLink, otherId: number, otherGender: string | null | undefined): string {
  const meta = linkKind(link.kind);
  if (meta.role) return wordFor(meta.role, otherGender);
  const word = link.aId === otherId ? meta.up : meta.down;
  return word ? wordFor(word, otherGender) : meta.label;
}

/* ------------------------------------------------------------
   Cycle detection (nobody can be their own ancestor)
   ------------------------------------------------------------ */

/**
 * True when adding "upperId is above lowerId" would make someone their own ancestor.
 * `ignorePair` skips the existing link of that pair, which is being replaced.
 */
export function createsAncestryCycle(links: KinLink[], upperId: number, lowerId: number): boolean {
  if (upperId === lowerId) return true;
  const samePair = (l: KinLink) =>
    (l.aId === upperId && l.bId === lowerId) || (l.aId === lowerId && l.bId === upperId);
  const children = new Map<number, number[]>();
  for (const l of links) {
    if (!isAncestry(l.kind) || samePair(l)) continue;
    children.set(l.aId, [...(children.get(l.aId) ?? []), l.bId]);
  }
  // Is upperId already below lowerId?
  const seen = new Set<number>();
  const stack = [lowerId];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === upperId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return false;
}

/* ------------------------------------------------------------
   Kinship words from a path
   ------------------------------------------------------------ */

const reverseStep = (s: Step): Step => (s === "U" ? "D" : s === "D" ? "U" : s);
const reversePath = (path: readonly Step[]): Step[] => [...path].reverse().map(reverseStep);

/** "", "Arrière-", "Arrière-arrière-"… */
const greats = (n: number) => (n <= 0 ? "" : `Arrière-${"arrière-".repeat(n - 1)}`);

function ancestorWord(up: number): Word {
  if (up === 1) return ["Parent", "Père", "Mère"];
  const pre = greats(up - 2);
  const lower = pre ? "grand-" : "Grand-";
  return [`${pre}${lower}parent`, `${pre}${lower}père`, `${pre}${lower}mère`];
}

function descendantWord(down: number): Word {
  if (down === 1) return ["Enfant", "Fils", "Fille"];
  const pre = greats(down - 2);
  const lower = pre ? "petit" : "Petit";
  return [`${pre}${lower}-enfant`, `${pre}${lower}-fils`, `${pre}${lower}e-fille`];
}

/** Word for a blood relative `up` generations up then `down` generations down. */
function bloodWord(up: number, down: number): Word | null {
  if (up === 0 && down === 0) return null;
  if (down === 0) return ancestorWord(up);
  if (up === 0) return descendantWord(down);
  if (up === 1 && down === 1) return ["Frère / sœur", "Frère", "Sœur"];
  if (down === 1) {
    const pre = greats(up - 3);
    if (up === 2) return ["Oncle / tante", "Oncle", "Tante"];
    const g = pre ? "grand-" : "Grand-";
    return [`${pre}${g}oncle / ${g}tante`, `${pre}${g}oncle`, `${pre}${g}tante`];
  }
  if (up === 1) {
    if (down === 2) return ["Neveu / nièce", "Neveu", "Nièce"];
    const pre = greats(down - 3);
    const p = pre ? "petit" : "Petit";
    return [`${pre}${p}-neveu / ${p}e-nièce`, `${pre}${p}-neveu`, `${pre}${p}e-nièce`];
  }
  if (up === 2 && down === 2) return ["Cousin·e germain·e", "Cousin germain", "Cousine germaine"];
  if (up === 3 && down === 3) return ["Cousin·e issu·e de germain", "Cousin issu de germain", "Cousine issue de germain"];
  if (up === 2 && down === 3) return ["Petit-cousin / petite-cousine", "Petit-cousin", "Petite-cousine"];
  return ["Cousin·e éloigné·e", "Cousin éloigné", "Cousine éloignée"];
}

const PARENT_IN_LAW: Word = ["Beau-parent", "Beau-père", "Belle-mère"];
const SIBLING_IN_LAW: Word = ["Beau-frère / belle-sœur", "Beau-frère", "Belle-sœur"];
const CHILD_IN_LAW: Word = ["Gendre / belle-fille", "Gendre", "Belle-fille"];
const STEP_CHILD: Word = ["Bel enfant", "Beau-fils", "Belle-fille"];
const PARTNER: Word = ["Conjoint·e", "Conjoint", "Conjointe"];
const HALF_SIBLING: Word = ["Demi-frère / demi-sœur", "Demi-frère", "Demi-sœur"];
const STEP_SIBLING: Word = ["Quasi-frère / quasi-sœur", "Quasi-frère", "Quasi-sœur"];

/**
 * Turns a path into a kinship word. Returns null when the path is too unusual
 * to be named (the UI then says "Famille" or "Famille par alliance").
 */
export function kinshipWord(path: readonly Step[], gender: string | null | undefined): string | null {
  // A child then their other parent is a co-parent: a partner (or ex).
  const steps: Step[] = [];
  for (const s of path) {
    if (s === "U" && steps.at(-1) === "D") steps.splice(-1, 1, "P");
    else steps.push(s);
  }
  // the child of a parent's partner
  if (/^U[PX]D$/.test(steps.join(""))) return wordFor(STEP_SIBLING, gender);
  const match = steps.join("").match(/^([PX]?)(U*)(D*)([PX]?)$/);
  if (!match) return null;
  const [, before, ups, downs, after] = match;
  const up = ups.length;
  const down = downs.length;
  const ex = before === "X" || after === "X" ? "Ex-" : "";
  const lowerFirst = (s: string) => (ex ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const say = (word: Word) => ex + lowerFirst(wordFor(word, gender));

  if (!before && !after) {
    const blood = bloodWord(up, down);
    return blood ? wordFor(blood, gender) : null;
  }
  if (up === 0 && down === 0) return before && after ? null : ex ? "Ex" : wordFor(PARTNER, gender);
  if (before && after) return up === 1 && down === 1 ? say(SIBLING_IN_LAW) : null;
  if (after) {
    // the partner of a relative
    if (up === 1 && down === 0) return say(PARENT_IN_LAW);
    if (up === 0 && down === 1) return say(CHILD_IN_LAW);
    if (up === 1 && down === 1) return say(SIBLING_IN_LAW);
  } else {
    // a relative of my partner
    if (up === 1 && down === 0) return say(PARENT_IN_LAW);
    if (up === 0 && down === 1) return say(STEP_CHILD);
    if (up === 1 && down === 1) return say(SIBLING_IN_LAW);
  }
  const blood = bloodWord(up, down);
  return blood ? `${say(blood)} par alliance` : null;
}

/* ------------------------------------------------------------
   Relationship of anyone to a reference person
   ------------------------------------------------------------ */

type Edge = { to: number; path: Step[] };

function familyGraph(links: KinLink[]): Map<number, Edge[]> {
  const graph = new Map<number, Edge[]>();
  const add = (from: number, edge: Edge) => graph.set(from, [...(graph.get(from) ?? []), edge]);
  for (const l of links) {
    const path = linkKind(l.kind).path;
    if (!path) continue;
    add(l.aId, { to: l.bId, path: [...path] });
    add(l.bId, { to: l.aId, path: reversePath(path) });
  }
  return graph;
}

/** Shortest kinship path from `fromId` to every reachable person (Dijkstra on path length). */
export function kinshipPaths(links: KinLink[], fromId: number): Map<number, Step[]> {
  const graph = familyGraph(links);
  const best = new Map<number, Step[]>([[fromId, []]]);
  const queue: number[] = [fromId];
  while (queue.length) {
    queue.sort((a, b) => best.get(a)!.length - best.get(b)!.length);
    const current = queue.shift()!;
    const base = best.get(current)!;
    for (const edge of graph.get(current) ?? []) {
      const candidate = [...base, ...edge.path];
      const known = best.get(edge.to);
      if (!known || candidate.length < known.length) {
        best.set(edge.to, candidate);
        queue.push(edge.to);
      }
    }
  }
  return best;
}

type KinPerson = { id: number; gender?: string | null };

/**
 * Relationship of each person to `rootId`, as seen from the root:
 * "Mère", "Oncle", "Belle-sœur", "Ami"… A direct link wins over a computed path.
 */
export function relationsTo(rootId: number, people: KinPerson[], links: KinLink[]): Map<number, string> {
  const gender = new Map(people.map((p) => [p.id, p.gender ?? null]));
  const parentsOf = (id: number) =>
    new Set(links.filter((l) => l.bId === id && (l.kind === "parent" || l.kind === "parent_adoptif")).map((l) => l.aId));
  const rootParents = parentsOf(rootId);
  const out = new Map<number, string>();
  for (const [id, path] of kinshipPaths(links, rootId)) {
    if (id === rootId) continue;
    // siblings through one parent: half-siblings when both parent pairs are known and differ
    if (path.join("") === "UD") {
      const theirs = parentsOf(id);
      if (rootParents.size >= 2 && theirs.size >= 2 && [...theirs].some((p) => !rootParents.has(p))) {
        out.set(id, wordFor(HALF_SIBLING, gender.get(id)));
        continue;
      }
    }
    out.set(id, kinshipWord(path, gender.get(id)) ?? (path.some((s) => s === "P" || s === "X") ? "Famille par alliance" : "Famille"));
  }
  for (const l of links) {
    if (l.aId !== rootId && l.bId !== rootId) continue;
    const other = l.aId === rootId ? l.bId : l.aId;
    out.set(other, l.label?.trim() || roleInLink(l, other, gender.get(other)));
  }
  return out;
}

/* ------------------------------------------------------------
   Picking a relation in a form (from the edited person's point of view)
   ------------------------------------------------------------ */

/** "kind" for symmetric kinds; "kind:up" (the other is above me) or "kind:down" for directed ones. */
export type RelationChoice = { value: string; label: string; group: LinkGroup };

export function relationChoices(otherGender?: string | null): RelationChoice[] {
  const out: RelationChoice[] = [];
  for (const [key, meta] of Object.entries(LINK_KINDS)) {
    if (meta.role) out.push({ value: key, label: wordFor(meta.role, otherGender), group: meta.group });
    if (meta.up) out.push({ value: `${key}:up`, label: wordFor(meta.up, otherGender), group: meta.group });
    if (meta.down) out.push({ value: `${key}:down`, label: wordFor(meta.down, otherGender), group: meta.group });
  }
  return out;
}

/** Converts a form choice into a stored link between `selfId` and `otherId`. */
export function linkFromChoice(selfId: number, otherId: number, choice: string): { aId: number; bId: number; kind: string } {
  const [kind, side] = choice.split(":");
  // "up": the other person holds the upper role (they are my parent…)
  return side === "up" ? { aId: otherId, bId: selfId, kind } : { aId: selfId, bId: otherId, kind };
}

/** Inverse of linkFromChoice, to prefill a form. */
export function choiceFromLink(link: KinLink, selfId: number): string {
  if (!isDirected(link.kind)) return link.kind;
  return `${link.kind}:${link.aId === selfId ? "down" : "up"}`;
}
