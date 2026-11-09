/*
 * Family tree layout (pure, framework-free).
 *
 * 1. the family of the root = everyone reachable through family/couple links;
 * 2. each person gets a generation from the link offsets (parent = 1 up…);
 * 3. partners are grouped into "units" drawn side by side;
 * 4. rows are ordered by the barycentre of parents / children (Sugiyama-style sweeps),
 *    then x positions are relaxed so parents sit above their children.
 */

import { linkKind, type KinLink } from "./kinship";

export const TREE_NODE = { width: 156, height: 62, gap: 26, partnerGap: 40, rowGap: 78, padding: 40 } as const;

export type TreeNode = { id: number; generation: number; x: number; y: number };

/** Parents → children connector (a "bus"). */
export type ChildGroup = {
  parentIds: number[];
  anchor: { x: number; y: number };
  busY: number;
  children: { id: number; x: number; y: number; dashed: boolean }[];
};

export type PartnerLine = { aId: number; bId: number; kind: string; x1: number; x2: number; y: number };

/** Family links the layout cannot express with connectors (cousin, oncle…), drawn as curves. */
export type ExtraEdge = { id?: number; aId: number; bId: number; kind: string };

export type FamilyTree = {
  nodes: Map<number, TreeNode>;
  partners: PartnerLine[];
  childGroups: ChildGroup[];
  siblingBrackets: { aId: number; bId: number; kind: string; x1: number; x2: number; y: number }[];
  extras: ExtraEdge[];
  width: number;
  height: number;
};

const PARENT_KINDS = new Set(["parent", "parent_adoptif"]);
const SIBLING_KINDS = new Set(["fratrie", "demi_fratrie"]);
const isPartner = (kind: string) => linkKind(kind).group === "couple";
const inTree = (kind: string) => Boolean(linkKind(kind).inTree);

/** Everyone connected to `rootId` through family and couple links. */
export function familyOf(rootId: number, links: KinLink[]): Set<number> {
  const out = new Set([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const l of links) {
      if (!inTree(l.kind)) continue;
      const other = l.aId === current ? l.bId : l.bId === current ? l.aId : null;
      if (other !== null && !out.has(other)) {
        out.add(other);
        stack.push(other);
      }
    }
  }
  return out;
}

/** Separate families (connected groups of at least two people), largest first. */
export function familyGroups(ids: number[], links: KinLink[]): number[][] {
  const seen = new Set<number>();
  const groups: number[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const group = [...familyOf(id, links)];
    group.forEach((g) => seen.add(g));
    if (group.length > 1) groups.push(group);
  }
  return groups.sort((a, b) => b.length - a.length);
}

/** Generation of each member, 0 = the oldest generation shown. */
export function assignGenerations(rootId: number, members: Set<number>, links: KinLink[]): Map<number, number> {
  const relevant = links.filter((l) => inTree(l.kind) && members.has(l.aId) && members.has(l.bId));
  const gen = new Map<number, number>([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const l of relevant) {
      const offset = linkKind(l.kind).generations;
      if (offset === undefined) continue;
      if (l.aId === current && !gen.has(l.bId)) {
        gen.set(l.bId, gen.get(current)! + offset);
        queue.push(l.bId);
      } else if (l.bId === current && !gen.has(l.aId)) {
        gen.set(l.aId, gen.get(current)! - offset);
        queue.push(l.aId);
      }
    }
  }
  // People only linked by "famille (autre)": same generation as their relative.
  let changed = true;
  while (changed) {
    changed = false;
    for (const l of relevant) {
      const [known, unknown] = gen.has(l.aId) ? [l.aId, l.bId] : [l.bId, l.aId];
      if (gen.has(known) && !gen.has(unknown)) {
        gen.set(unknown, gen.get(known)!);
        changed = true;
      }
    }
  }
  for (const id of members) if (!gen.has(id)) gen.set(id, 0);
  const min = Math.min(...gen.values());
  return new Map([...gen].map(([id, g]) => [id, g - min]));
}

/** Partners in a row, as units placed side by side (the person with most partners in the middle). */
function buildUnits(row: number[], partnersOf: Map<number, Set<number>>): number[][] {
  const inRow = new Set(row);
  const seen = new Set<number>();
  const units: number[][] = [];
  for (const id of row) {
    if (seen.has(id)) continue;
    const group: number[] = [];
    const stack = [id];
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current) || !inRow.has(current)) continue;
      seen.add(current);
      group.push(current);
      stack.push(...(partnersOf.get(current) ?? []));
    }
    const degree = (x: number) => [...(partnersOf.get(x) ?? [])].filter((p) => inRow.has(p)).length;
    const [hub, ...rest] = [...group].sort((a, b) => degree(b) - degree(a) || row.indexOf(a) - row.indexOf(b));
    const ordered = [hub];
    rest.forEach((r, i) => (i % 2 === 0 ? ordered.push(r) : ordered.unshift(r)));
    units.push(ordered);
  }
  return units;
}

const unitWidth = (unit: number[]) =>
  unit.length * TREE_NODE.width + (unit.length - 1) * TREE_NODE.partnerGap;

const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/** Places units in order, as close as possible to their wished centre, without overlap. */
function placeRow(units: number[][], wished: (number | null)[], current: number[]): number[] {
  const widths = units.map(unitWidth);
  const target = units.map((_, i) => wished[i] ?? current[i]);
  // left-to-right and right-to-left passes; their average keeps the order and the gaps
  const ltr: number[] = [];
  units.forEach((_, i) => {
    const min = i === 0 ? -Infinity : ltr[i - 1] + widths[i - 1] / 2 + TREE_NODE.gap + widths[i] / 2;
    ltr.push(Math.max(target[i], min));
  });
  const rtl: number[] = new Array(units.length);
  for (let i = units.length - 1; i >= 0; i--) {
    const max = i === units.length - 1 ? Infinity : rtl[i + 1] - widths[i + 1] / 2 - TREE_NODE.gap - widths[i] / 2;
    rtl[i] = Math.min(target[i], max);
  }
  return units.map((_, i) => (ltr[i] + rtl[i]) / 2);
}

export function layoutFamilyTree(rootId: number, links: KinLink[]): FamilyTree {
  const members = familyOf(rootId, links);
  const family = links.filter((l) => inTree(l.kind) && members.has(l.aId) && members.has(l.bId));
  const gen = assignGenerations(rootId, members, family);

  // parents (bio / adoptive, one generation up) and step-parents of each child
  const parentsOf = new Map<number, { id: number; kind: string }[]>();
  const partnersOf = new Map<number, Set<number>>();
  const connectorLinks = new Set<KinLink>();
  for (const l of family) {
    const ga = gen.get(l.aId)!;
    const gb = gen.get(l.bId)!;
    if ((PARENT_KINDS.has(l.kind) || l.kind === "beau_parent") && gb - ga === 1) {
      parentsOf.set(l.bId, [...(parentsOf.get(l.bId) ?? []), { id: l.aId, kind: l.kind }]);
      connectorLinks.add(l);
    } else if (isPartner(l.kind) && ga === gb) {
      partnersOf.set(l.aId, new Set([...(partnersOf.get(l.aId) ?? []), l.bId]));
      partnersOf.set(l.bId, new Set([...(partnersOf.get(l.bId) ?? []), l.aId]));
      connectorLinks.add(l);
    }
  }
  const childrenOf = new Map<number, number[]>();
  parentsOf.forEach((ps, child) => ps.forEach((p) => childrenOf.set(p.id, [...(childrenOf.get(p.id) ?? []), child])));

  // rows, in discovery order (stable)
  const depth = Math.max(...gen.values());
  const rows: number[][] = Array.from({ length: depth + 1 }, () => []);
  [...members].forEach((id) => rows[gen.get(id)!].push(id));
  const units = rows.map((row) => buildUnits(row, partnersOf));

  const x = new Map<number, number>();
  const unitCentres = (row: number[][]) => {
    let cursor = 0;
    return row.map((u) => {
      const w = unitWidth(u);
      const c = cursor + w / 2;
      cursor += w + TREE_NODE.gap;
      return c;
    });
  };
  const applyRow = (row: number[][], centres: number[]) =>
    row.forEach((u, i) => {
      const left = centres[i] - unitWidth(u) / 2;
      u.forEach((id, k) => x.set(id, left + k * (TREE_NODE.width + TREE_NODE.partnerGap) + TREE_NODE.width / 2));
    });
  units.forEach((row) => applyRow(row, unitCentres(row)));

  const wishedFrom = (unit: number[], neighbours: (id: number) => number[]) => {
    const xs = unit.flatMap(neighbours).filter((n) => x.has(n)).map((n) => x.get(n)!);
    return xs.length ? mean(xs) : null;
  };
  const parentIds = (id: number) => (parentsOf.get(id) ?? []).filter((p) => p.kind !== "beau_parent").map((p) => p.id);
  const childIds = (id: number) => childrenOf.get(id) ?? [];
  const currentCentres = (row: number[][]) => row.map((u) => mean(u.map((id) => x.get(id)!)));

  // ordering sweeps (barycentre), then position relaxation
  for (let pass = 0; pass < 6; pass++) {
    const down = pass % 2 === 0;
    const order = down ? units.map((_, i) => i) : units.map((_, i) => units.length - 1 - i);
    for (const r of order) {
      const row = units[r];
      const centres = currentCentres(row);
      const wished = row.map((u) => wishedFrom(u, down ? parentIds : childIds));
      if (pass < 4) {
        const sorted = row
          .map((u, i) => ({ u, key: wished[i] ?? centres[i], i }))
          .sort((a, b) => a.key - b.key || a.i - b.i);
        units[r] = sorted.map((s) => s.u);
        const reordered = units[r];
        applyRow(reordered, placeRow(reordered, sorted.map((s) => s.key), unitCentres(reordered)));
      } else {
        applyRow(row, placeRow(row, wished, centres));
      }
    }
  }

  const minX = Math.min(...x.values()) - TREE_NODE.width / 2;
  const rowY = (g: number) => TREE_NODE.padding + g * (TREE_NODE.height + TREE_NODE.rowGap);
  const nodes = new Map<number, TreeNode>();
  members.forEach((id) =>
    nodes.set(id, { id, generation: gen.get(id)!, x: x.get(id)! - minX + TREE_NODE.padding, y: rowY(gen.get(id)!) })
  );

  // partner lines
  const partners: PartnerLine[] = family
    .filter((l) => isPartner(l.kind) && connectorLinks.has(l))
    .map((l) => {
      const a = nodes.get(l.aId)!;
      const b = nodes.get(l.bId)!;
      const [left, right] = a.x < b.x ? [a, b] : [b, a];
      return { aId: l.aId, bId: l.bId, kind: l.kind, x1: left.x + TREE_NODE.width / 2, x2: right.x - TREE_NODE.width / 2, y: a.y + TREE_NODE.height / 2 };
    });

  // children grouped by their set of (bio / adoptive) parents
  const groups = new Map<string, ChildGroup>();
  parentsOf.forEach((ps, child) => {
    const own = ps.filter((p) => p.kind !== "beau_parent");
    if (!own.length) return;
    const ids = own.map((p) => p.id).sort((a, b) => a - b);
    const key = ids.join("-");
    const c = nodes.get(child)!;
    if (!groups.has(key)) {
      const parentNodes = ids.map((id) => nodes.get(id)!);
      const paired = ids.length === 2 && partnersOf.get(ids[0])?.has(ids[1]);
      const ax = mean(parentNodes.map((p) => p.x));
      const top = parentNodes[0].y;
      groups.set(key, {
        parentIds: ids,
        anchor: { x: ax, y: paired ? top + TREE_NODE.height / 2 : top + TREE_NODE.height },
        busY: top + TREE_NODE.height + TREE_NODE.rowGap / 2,
        children: [],
      });
    }
    groups.get(key)!.children.push({ id: child, x: c.x, y: c.y, dashed: own.every((p) => p.kind === "parent_adoptif") });
  });
  // step-parents drawn as their own dashed connector
  parentsOf.forEach((ps, child) =>
    ps
      .filter((p) => p.kind === "beau_parent")
      .forEach((p) => {
        const parent = nodes.get(p.id)!;
        const c = nodes.get(child)!;
        groups.set(`step-${p.id}-${child}`, {
          parentIds: [p.id],
          anchor: { x: parent.x, y: parent.y + TREE_NODE.height },
          busY: parent.y + TREE_NODE.height + TREE_NODE.rowGap / 2 + 8,
          children: [{ id: child, x: c.x, y: c.y, dashed: true }],
        });
      })
  );
  // several sibling groups under the same row (remarriages…): stagger their buses
  const byRow = new Map<number, ChildGroup[]>();
  groups.forEach((g) => byRow.set(g.busY, [...(byRow.get(g.busY) ?? []), g]));
  byRow.forEach((row) =>
    row
      .sort((a, b) => a.anchor.x - b.anchor.x)
      .forEach((g, i) => {
        if (row.length > 1) g.busY += (i - (row.length - 1) / 2) * 7;
      })
  );

  // siblings that do not share a parent shown in the tree: a bracket above them
  const sameParents = (a: number, b: number) => {
    const pa = parentIds(a).sort().join("-");
    return pa !== "" && pa === parentIds(b).sort().join("-");
  };
  const siblingBrackets: FamilyTree["siblingBrackets"] = [];
  const extras: ExtraEdge[] = [];
  for (const l of family) {
    if (connectorLinks.has(l)) continue;
    const a = nodes.get(l.aId)!;
    const b = nodes.get(l.bId)!;
    if (SIBLING_KINDS.has(l.kind) && a.generation === b.generation) {
      if (!sameParents(l.aId, l.bId)) {
        siblingBrackets.push({ aId: l.aId, bId: l.bId, kind: l.kind, x1: Math.min(a.x, b.x), x2: Math.max(a.x, b.x), y: a.y - 16 });
      }
      continue;
    }
    // cousins, oncles, grands-parents without the parents in between, inconsistent generations…
    extras.push({ id: l.id, aId: l.aId, bId: l.bId, kind: l.kind });
  }

  const width = Math.max(...[...nodes.values()].map((n) => n.x)) + TREE_NODE.width / 2 + TREE_NODE.padding;
  const height = rowY(depth) + TREE_NODE.height + TREE_NODE.padding;
  return { nodes, partners, childGroups: [...groups.values()], siblingBrackets, extras, width, height };
}
