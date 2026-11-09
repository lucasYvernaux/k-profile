"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Btn, EmptyState, Select } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import { COLD_COLOR, displayName, intimacyMeta, lifeYears, shortName, type Person, type PersonLink } from "../domain/network";
import { LINK_KINDS, linkKind, relationsTo } from "../domain/kinship";
import { TREE_NODE, familyGroups, layoutFamilyTree } from "../domain/family-tree";

const SELF_COLOR = "#fbbf24";
const { width: W, height: H } = TREE_NODE;

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Kinds shown in the legend, in this order. */
const LEGEND = ["parent", "parent_adoptif", "beau_parent", "marie", "couple", "ex", "fratrie", "cousin", "oncle_tante", "grand_parent"];

export function FamilyTree({
  people,
  links,
  onOpen,
  onCreateSelf,
}: {
  people: Person[];
  links: PersonLink[];
  onOpen: (id: number) => void;
  onCreateSelf: () => void;
}) {
  const self = people.find((p) => p.isSelf) ?? null;
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const groups = useMemo(() => familyGroups(people.map((p) => p.id), links), [people, links]);

  /** Default root: me if I belong to a family, else the most connected person of the largest family. */
  const defaultRoot = useMemo(() => {
    if (self && groups.some((g) => g.includes(self.id))) return self.id;
    const largest = groups[0];
    if (!largest) return null;
    const degree = (id: number) => links.filter((l) => l.aId === id || l.bId === id).length;
    return [...largest].sort((a, b) => degree(b) - degree(a))[0];
  }, [self, groups, links]);

  const [chosenRoot, setChosenRoot] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  /** null = fit the tree to the available width */
  const [zoom, setZoom] = useState<number | null>(null);
  const rootId = chosenRoot !== null && byId.has(chosenRoot) && groups.some((g) => g.includes(chosenRoot)) ? chosenRoot : defaultRoot;

  const tree = useMemo(() => (rootId === null ? null : layoutFamilyTree(rootId, links)), [rootId, links]);
  const relations = useMemo(() => (rootId === null ? new Map<number, string>() : relationsTo(rootId, people, links)), [rootId, people, links]);

  const focus = selected;
  const focusIds = useMemo(() => {
    const ids = new Set<number>();
    if (focus === null) return ids;
    ids.add(focus);
    links.forEach((l) => {
      if (l.aId === focus) ids.add(l.bId);
      if (l.bId === focus) ids.add(l.aId);
    });
    return ids;
  }, [focus, links]);
  const dimNode = (id: number) => focus !== null && !focusIds.has(id);
  const dimEdge = (...ids: number[]) => focus !== null && !ids.includes(focus);

  if (!tree || rootId === null) {
    return (
      <div className="py-10">
        <EmptyState
          icon="git-fork"
          title="Pas encore d'arbre"
          sub="Ajoute des liens familiaux dans les fiches (parent, enfant, frère / sœur, conjoint, cousin…) : l'arbre se construit tout seul."
        />
        {!self && (
          <div className="text-center mt-2">
            <Btn variant="primary" onClick={onCreateSelf}>
              <DynIcon name="user-plus" className="w-3.5 h-3.5" /> Créer ma fiche « Moi »
            </Btn>
            <p className="text-[10px] text-smoke mt-2">Ta fiche sert de racine : tes parents, frères et sœurs se placent autour de toi.</p>
          </div>
        )}
      </div>
    );
  }

  const root = byId.get(rootId)!;
  const sel = selected !== null ? byId.get(selected) ?? null : null;
  const usedKinds = new Set(links.filter((l) => tree.nodes.has(l.aId) && tree.nodes.has(l.bId)).map((l) => l.kind));

  return (
    <div>
      {/* Barre d'outils */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.16em] text-smoke">Arbre de</span>
          <Select aria-label="Arbre de" value={rootId} onChange={(e) => { setChosenRoot(Number(e.target.value)); setSelected(null); }} className="!py-1.5 !w-auto text-xs">
            {groups.map((g, i) => (
              <optgroup key={i} label={`Famille ${i + 1} · ${g.length} personnes`}>
                {g
                  .map((id) => byId.get(id)!)
                  .sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || displayName(a).localeCompare(displayName(b), "fr"))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.isSelf ? "Moi" : displayName(p)}</option>
                  ))}
              </optgroup>
            ))}
          </Select>
          {!self && (
            <button onClick={onCreateSelf} className="text-[10px] px-2.5 py-1 rounded-full border border-ember/40 text-flame hover:bg-ember/10">
              + Créer ma fiche « Moi »
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.4, (z ?? 1) / 1.2))} className="w-7 h-7 rounded-lg border border-line text-dust hover:text-ash flex items-center justify-center" aria-label="Dézoomer">
            <DynIcon name="minus" className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(zoom === null ? 1 : null)} className="px-2 h-7 rounded-lg border border-line text-[10px] text-dust hover:text-ash" title="Ajuster à la largeur / taille réelle">
            {zoom === null ? "Ajusté" : `${Math.round(zoom * 100)}%`}
          </button>
          <button onClick={() => setZoom((z) => Math.min(2, (z ?? 1) * 1.2))} className="w-7 h-7 rounded-lg border border-line text-dust hover:text-ash flex items-center justify-center" aria-label="Zoomer">
            <DynIcon name="plus" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Personne sélectionnée */}
      <div className="min-h-[44px] mb-2">
        {sel ? (
          <div className="flex items-center gap-3 flex-wrap rounded-xl border border-line bg-[#121214] px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ash truncate">{sel.isSelf ? "Moi" : displayName(sel)}</p>
              <p className="text-[10px] text-smoke">
                {sel.id === rootId ? "Racine de l'arbre" : `${relations.get(sel.id) ?? "Famille"} de ${root.isSelf ? "moi" : shortName(root)}`}
                {lifeYears(sel) ? ` · ${lifeYears(sel)}` : ""}
              </p>
            </div>
            {sel.id !== rootId && <Btn small variant="outline" onClick={() => { setChosenRoot(sel.id); }}>Centrer ici</Btn>}
            <Btn small onClick={() => onOpen(sel.id)}>Voir la fiche</Btn>
          </div>
        ) : (
          <p className="text-[10px] text-smoke pt-3">Clique sur une personne pour voir sa relation avec {root.isSelf ? "toi" : shortName(root)} · « Centrer ici » change la racine.</p>
        )}
      </div>

      <div className="rounded-xl border border-line bg-[#0c0c0e] overflow-auto max-h-[78vh]" onClick={() => setSelected(null)}>
        <svg
          width={zoom === null ? "100%" : tree.width * zoom}
          height={zoom === null ? undefined : tree.height * zoom}
          style={zoom === null ? { maxWidth: tree.width, height: "auto" } : undefined}
          viewBox={`0 0 ${tree.width} ${tree.height}`}
          className="select-none block mx-auto"
          role="group"
          aria-label={`Arbre généalogique de ${root.isSelf ? "moi" : displayName(root)}`}
        >
          {/* Générations */}
          {[...new Set([...tree.nodes.values()].map((n) => n.y))].map((y) => (
            <line key={y} x1={0} x2={tree.width} y1={y + H / 2} y2={y + H / 2} stroke="#1c1c20" strokeDasharray="2 8" />
          ))}

          {/* Liens éloignés (cousins, oncles…) */}
          {tree.extras.map((e, i) => {
            const a = tree.nodes.get(e.aId)!;
            const b = tree.nodes.get(e.bId)!;
            const m = linkKind(e.kind);
            const top = Math.min(a.y, b.y) - 30;
            const d = `M ${a.x} ${a.y} C ${a.x} ${top}, ${b.x} ${top}, ${b.x} ${b.y}`;
            return (
              <g key={`x-${i}`} opacity={dimEdge(e.aId, e.bId) ? 0.08 : 0.55}>
                <path d={d} fill="none" stroke={m.color} strokeWidth={1.3} strokeDasharray={m.dash ?? "3 4"} />
                <text x={(a.x + b.x) / 2} y={top + 18} textAnchor="middle" fill={m.color} fontSize="10">{m.label}</text>
              </g>
            );
          })}

          {/* Parents → enfants */}
          {tree.childGroups.map((g, i) => {
            const xs = [g.anchor.x, ...g.children.map((c) => c.x)];
            const faded = dimEdge(...g.parentIds, ...g.children.map((c) => c.id));
            const step = g.children.every((c) => c.dashed);
            const color = step ? LINK_KINDS.beau_parent.color : LINK_KINDS.parent.color;
            return (
              <g key={`g-${i}`} stroke={color} strokeWidth={1.6} fill="none" opacity={faded ? 0.12 : 0.75} strokeDasharray={step ? "6 3" : undefined}>
                <path d={`M ${g.anchor.x} ${g.anchor.y} V ${g.busY} M ${Math.min(...xs)} ${g.busY} H ${Math.max(...xs)}`} />
                {g.children.map((c) => (
                  <path key={c.id} d={`M ${c.x} ${g.busY} V ${c.y}`} strokeDasharray={c.dashed ? "6 3" : undefined} />
                ))}
              </g>
            );
          })}

          {/* Frères et sœurs sans parents connus */}
          {tree.siblingBrackets.map((s, i) => {
            const m = linkKind(s.kind);
            const top = s.y + 16;
            return (
              <path key={`s-${i}`} d={`M ${s.x1} ${top} V ${s.y} H ${s.x2} V ${top}`} fill="none" stroke={m.color} strokeWidth={1.4} strokeDasharray={m.dash} opacity={dimEdge(s.aId, s.bId) ? 0.12 : 0.7} />
            );
          })}

          {/* Couples */}
          {tree.partners.map((p, i) => {
            const m = linkKind(p.kind);
            const mid = (p.x1 + p.x2) / 2;
            return (
              <g key={`p-${i}`} opacity={dimEdge(p.aId, p.bId) ? 0.12 : 0.9}>
                <line x1={p.x1} x2={p.x2} y1={p.y} y2={p.y} stroke={m.color} strokeWidth={2} strokeDasharray={m.dash} />
                {p.kind === "marie" && <circle cx={mid} cy={p.y} r={4} fill="#0c0c0e" stroke={m.color} strokeWidth={1.5} />}
                {p.kind === "ex" && <text x={mid} y={p.y - 5} textAnchor="middle" fill={m.color} fontSize="9">ex</text>}
              </g>
            );
          })}

          {/* Personnes */}
          {[...tree.nodes.values()].map((n, i) => {
            const p = byId.get(n.id);
            if (!p) return null;
            const isRoot = n.id === rootId;
            const color = p.isSelf ? SELF_COLOR : p.coldSince ? COLD_COLOR : p.deceased ? "#525252" : intimacyMeta(p.intimacy).color;
            const left = n.x - W / 2;
            const relation = p.isSelf ? "Moi" : isRoot ? "Racine de l'arbre" : relations.get(n.id) ?? "Famille";
            const years = lifeYears(p);
            const visibleLines = [
              `${truncate(shortName(p), 14)}${p.deceased ? " †" : ""}`,
              truncate(relation, 19),
              years ?? (p.lastName && !p.isSelf ? truncate(p.lastName, 18) : ""),
            ];
            const extras = [
              displayName(p) !== shortName(p) ? displayName(p) : "",
              p.deceased ? "décédé·e" : "",
              p.coldSince ? "en froid" : "",
            ];
            const nodeLabel = [...visibleLines, ...extras].filter(Boolean).join(", ");
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: dimNode(n.id) ? 0.25 : 1 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.01, 0.3) }}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setSelected(selected === n.id ? null : n.id); }}
                onDoubleClick={() => onOpen(n.id)}
                // keyboard: Tab to reach, Enter / Space to select, then "Voir la fiche"
                role="button"
                tabIndex={0}
                aria-pressed={selected === n.id}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(selected === n.id ? null : n.id);
                  }
                }}
              >
                {/* SVG <title>: accessible name and hover tooltip, starting with the visible lines (WCAG 2.5.3). */}
                <title>{nodeLabel}</title>
                <rect
                  x={left}
                  y={n.y}
                  width={W}
                  height={H}
                  rx={12}
                  fill={isRoot ? "#1a1508" : "#151517"}
                  stroke={color}
                  strokeWidth={isRoot || selected === n.id ? 2.4 : 1.3}
                  strokeDasharray={p.coldSince ? "5 3" : undefined}
                  style={isRoot ? { filter: `drop-shadow(0 0 8px ${color}66)` } : undefined}
                />
                <circle cx={left + 24} cy={n.y + H / 2} r={15} fill="#0f0f11" stroke={color} strokeWidth={1.5} opacity={p.deceased ? 0.6 : 1} />
                <text x={left + 24} y={n.y + H / 2 + 4} textAnchor="middle" fill="#e5e5e5" fontSize={p.isSelf ? 8.5 : 11} fontWeight="700" aria-hidden="true">
                  {p.isSelf ? "MOI" : `${p.firstName[0] ?? ""}${p.lastName?.[0] ?? ""}`.toUpperCase()}
                </text>
                <text x={left + 46} y={n.y + 20} fill={p.deceased ? "#a3a3a3" : "#f5f5f5"} fontSize="12" fontWeight="600">
                  {truncate(shortName(p), 14)}
                  {p.deceased ? " †" : ""}
                </text>
                <text x={left + 46} y={n.y + 35} fill={isRoot ? SELF_COLOR : "#d6a24a"} fontSize="10.5">{truncate(relation, 19)}</text>
                <text x={left + 46} y={n.y + 50} fill="#a0a0a0" fontSize="9.5">
                  {years ?? (p.lastName && !p.isSelf ? truncate(p.lastName, 18) : "")}
                </text>
                {p.coldSince && (
                  <text x={left + W - 12} y={n.y + 16} textAnchor="middle" fill={COLD_COLOR} fontSize="12" aria-hidden="true">❄</text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* Légende */}
      <div className="flex gap-x-3 gap-y-1.5 flex-wrap mt-3">
        {LEGEND.filter((k) => usedKinds.has(k)).map((k) => {
          const m = LINK_KINDS[k];
          return (
            <span key={k} className="flex items-center gap-1.5 text-[10px] text-dust">
              <svg width="18" height="4" aria-hidden="true"><line x1="0" y1="2" x2="18" y2="2" stroke={m.color} strokeWidth="2" strokeDasharray={m.dash} /></svg>
              {m.label}
            </span>
          );
        })}
        <span className="flex items-center gap-1.5 text-[10px] text-dust"><span style={{ color: COLD_COLOR }}>❄</span> En froid</span>
        <span className="flex items-center gap-1.5 text-[10px] text-dust">† Décédé·e</span>
      </div>
      <p className="text-[10px] text-smoke mt-2">
        Les relations (oncle, cousine, belle-sœur…) sont déduites des liens. Pour plus de précision, renseigne le genre dans les fiches. Double-clic : ouvrir la fiche.
      </p>
    </div>
  );
}
