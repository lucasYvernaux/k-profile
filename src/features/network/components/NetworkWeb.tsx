"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DynIcon } from "@/shared/ui/icon";
import {
  COLD_COLOR, INTIMACY, freshness, initials, intimacyMeta, shortName,
  type Person, type PersonLink,
} from "@/features/network/domain/network";
import { linkKind } from "@/features/network/domain/kinship";

const SIZE = 1000;
const C = SIZE / 2;
/** Rayon de l'anneau par niveau d'intimité : le cercle intime au centre */
const RING: Record<number, number> = { 5: 125, 4: 215, 3: 300, 2: 380, 1: 455 };
const NODE_R: Record<number, number> = { 5: 27, 4: 23, 3: 20, 2: 17, 1: 15 };

type Node = { p: Person; angle: number; x: number; y: number; r: number };

/**
 * Placement : chaque personne reste sur l'anneau de son niveau,
 * seul son angle bouge. Les personnes liées s'attirent, toutes se repoussent.
 */
function layout(people: Person[], links: PersonLink[]): Map<number, Node> {
  const byLevel = new Map<number, Person[]>();
  people.forEach((p) => byLevel.set(p.intimacy, [...(byLevel.get(p.intimacy) ?? []), p]));
  const nodes: Node[] = [];
  byLevel.forEach((list, level) => {
    [...list]
      .sort((a, b) => a.id - b.id)
      .forEach((p, i) => {
        const angle = (Math.PI * 2 * i) / list.length + level * 0.7;
        nodes.push({ p, angle, x: 0, y: 0, r: RING[level] ?? RING[3] });
      });
  });
  const idx = new Map(nodes.map((n, i) => [n.p.id, i]));
  const place = (n: Node) => {
    n.x = C + n.r * Math.cos(n.angle);
    n.y = C + n.r * Math.sin(n.angle);
  };
  nodes.forEach(place);

  for (let it = 0; it < 260; it++) {
    const cool = 1 - it / 300;
    const fx = new Array(nodes.length).fill(0);
    const fy = new Array(nodes.length).fill(0);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const f = 5200 / d2;
        const d = Math.sqrt(d2);
        fx[i] += (dx / d) * f; fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f; fy[j] -= (dy / d) * f;
      }
    }
    for (const l of links) {
      const a = idx.get(l.aId);
      const b = idx.get(l.bId);
      if (a === undefined || b === undefined) continue;
      const dx = nodes[b].x - nodes[a].x;
      const dy = nodes[b].y - nodes[a].y;
      fx[a] += dx * 0.012; fy[a] += dy * 0.012;
      fx[b] -= dx * 0.012; fy[b] -= dy * 0.012;
    }
    nodes.forEach((n, i) => {
      // composante tangentielle uniquement → l'angle bouge, le rayon reste fixe
      const tx = -Math.sin(n.angle);
      const ty = Math.cos(n.angle);
      const ft = fx[i] * tx + fy[i] * ty;
      n.angle += Math.max(-0.08, Math.min(0.08, (ft / n.r) * cool));
      place(n);
    });
  }
  return new Map(nodes.map((n) => [n.p.id, n]));
}

export function NetworkWeb({
  people,
  links,
  selfId = null,
  highlight = null,
  selectedId,
  onSelect,
  onOpen,
}: {
  people: Person[];
  links: PersonLink[];
  /** The user's own record: its links start from the centre ("MOI"). */
  selfId?: number | null;
  /** When set, only these people are emphasised (e.g. a domain filter). */
  highlight?: Set<number> | null;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onOpen: (id: number) => void;
}) {
  const nodes = useMemo(() => layout(people, links), [people, links]);
  const pos = (id: number) => (id === selfId ? { x: C, y: C } : nodes.get(id));
  const [hover, setHover] = useState<number | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const focus = hover ?? selectedId;
  const neighbors = useMemo(() => {
    const s = new Set<number>();
    if (focus === null) return s;
    s.add(focus);
    links.forEach((l) => {
      if (l.aId === focus) s.add(l.bId);
      if (l.bId === focus) s.add(l.aId);
    });
    return s;
  }, [focus, links]);

  const visibleLinks = links.filter((l) => !kindFilter || l.kind === kindFilter);
  const usedKinds = [...new Set(links.map((l) => l.kind))];

  function zoom(f: number) {
    setView((v) => {
      const k = Math.max(0.5, Math.min(3, v.k * f));
      // zoom centré
      return { k, x: C - ((C - v.x) / v.k) * k, y: C - ((C - v.y) / v.k) * k };
    });
  }

  function onDown(e: React.PointerEvent) {
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    const scale = SIZE / svgRef.current.getBoundingClientRect().width;
    const dx = (e.clientX - d.sx) * scale;
    const dy = (e.clientY - d.sy) * scale;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  }
  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) onSelect(null);
  }

  if (people.length === 0) {
    return <div className="text-[12px] text-smoke text-center py-24">Ajoute des personnes pour voir ta toile.</div>;
  }

  return (
    <div className="relative">
      {/* Légende + zoom */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {usedKinds.map((k) => {
            const m = linkKind(k);
            const active = kindFilter === k;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(active ? null : k)}
                className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  active ? "border-ember/50 text-ash bg-ember/10" : "border-line text-dust hover:text-ash"
                } ${kindFilter && !active ? "opacity-40" : ""}`}
              >
                <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke={m.color} strokeWidth="2" strokeDasharray={m.dash} /></svg>
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          <button onClick={() => zoom(1 / 1.25)} aria-label="Dézoomer" className="w-7 h-7 rounded-lg border border-line text-dust hover:text-ash flex items-center justify-center">
            <DynIcon name="minus" className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label={`${Math.round(view.k * 100)}%, réinitialiser le zoom`} className="px-2 h-7 rounded-lg border border-line text-[10px] text-dust hover:text-ash">
            {Math.round(view.k * 100)}%
          </button>
          <button onClick={() => zoom(1.25)} aria-label="Zoomer" className="w-7 h-7 rounded-lg border border-line text-dust hover:text-ash flex items-center justify-center">
            <DynIcon name="plus" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-[#0c0c0c] overflow-hidden touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-auto max-h-[78vh] cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => (drag.current = null)}
        >
          <defs>
            <radialGradient id="core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(212,175,55,0.16)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <circle cx={C} cy={C} r={RING[5] + 40} fill="url(#core)" />
            {/* Anneaux */}
            {[5, 4, 3, 2, 1].map((lvl) => (
              <g key={lvl}>
                <circle cx={C} cy={C} r={RING[lvl]} fill="none" stroke={INTIMACY[lvl].color} strokeOpacity="0.16" strokeDasharray="2 6" />
                <text x={C} y={C - RING[lvl] - 6} textAnchor="middle" fill={INTIMACY[lvl].color} fontSize="11" letterSpacing="2">
                  {INTIMACY[lvl].label.toUpperCase()}
                </text>
              </g>
            ))}

            {/* Liens « moi » → cercle intime, très discrets */}
            {[...nodes.values()].filter((n) => n.p.intimacy >= 5).map((n) => (
              <line key={`me-${n.p.id}`} x1={C} y1={C} x2={n.x} y2={n.y} stroke="#d4af37" strokeOpacity={focus === null || neighbors.has(n.p.id) ? 0.12 : 0.04} />
            ))}

            {/* Liens entre personnes : courbes tirées vers le centre */}
            {visibleLinks.map((l) => {
              const a = pos(l.aId);
              const b = pos(l.bId);
              if (!a || !b) return null;
              const m = linkKind(l.kind);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const qx = mx + (C - mx) * 0.25;
              const qy = my + (C - my) * 0.25;
              const lit = focus === null || l.aId === focus || l.bId === focus;
              return (
                <g key={l.id}>
                  <motion.path
                    d={`M ${a.x} ${a.y} Q ${qx} ${qy} ${b.x} ${b.y}`}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={lit && focus !== null ? 2.6 : 1.6}
                    strokeDasharray={m.dash}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: lit ? 0.85 : 0.08 }}
                    transition={{ duration: 0.25 }}
                    style={{ filter: lit && focus !== null ? `drop-shadow(0 0 4px ${m.color})` : undefined }}
                  />
                  {lit && focus !== null && l.label && (
                    <text x={(mx + qx) / 2} y={(my + qy) / 2 - 4} textAnchor="middle" fill={m.color} fontSize="11">
                      {l.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Moi */}
            <circle
              cx={C}
              cy={C}
              r={30}
              fill="#141414"
              stroke="#d4af37"
              strokeWidth={selfId !== null && selectedId === selfId ? 3 : 2}
              style={{ filter: "drop-shadow(0 0 10px rgba(212,175,55,0.5))", cursor: selfId !== null ? "pointer" : undefined }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => { if (selfId === null) return; e.stopPropagation(); onSelect(selectedId === selfId ? null : selfId); }}
            />
            <text x={C} y={C + 4} textAnchor="middle" fill="#e6c35c" fontSize="12" fontWeight="700" letterSpacing="1.5">MOI</text>

            {/* Personnes */}
            {[...nodes.values()].map((n, i) => {
              const meta = intimacyMeta(n.p.intimacy);
              const fr = freshness(n.p);
              const r = NODE_R[n.p.intimacy] ?? 18;
              const dim = (focus !== null && !neighbors.has(n.p.id)) || (highlight !== null && !highlight.has(n.p.id));
              const isCold = Boolean(n.p.coldSince);
              const stroke = isCold ? COLD_COLOR : n.p.deceased ? "#525252" : meta.color;
              const sel = selectedId === n.p.id;
              const freshnessLabel = fr.status !== "none" && fr.status !== "cold" ? `, ${fr.status === "late" ? "À recontacter" : "Bientôt"}` : "";
              return (
                <motion.g
                  key={n.p.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: dim ? 0.22 : 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.015, 0.4) }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: "pointer" }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => { e.stopPropagation(); onSelect(sel ? null : n.p.id); }}
                  onDoubleClick={() => onOpen(n.p.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={sel}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(sel ? null : n.p.id);
                    }
                  }}
                  onFocus={() => setHover(n.p.id)}
                  onBlur={() => setHover(null)}
                  onPointerEnter={() => setHover(n.p.id)}
                  onPointerLeave={() => setHover(null)}
                >
                  {/* SVG <title>: accessible name and hover tooltip. Starts with the visible name (WCAG 2.5.3). */}
                  <title>{`${shortName(n.p)}, ${meta.label}${n.p.coldSince ? ", en froid" : ""}${freshnessLabel}`}</title>
                  {sel && <circle cx={n.x} cy={n.y} r={r + 7} fill="none" stroke={meta.color} strokeWidth="1.5" strokeDasharray="3 3" />}
                  <circle cx={n.x} cy={n.y} r={r} fill="#1a1a1a" stroke={stroke} strokeWidth={sel ? 3 : 2} strokeDasharray={isCold ? "4 3" : undefined} />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#e5e5e5" fontSize={r * 0.55} fontWeight="700" aria-hidden="true">
                    {initials(n.p)}
                  </text>
                  {highlight?.has(n.p.id) && <circle cx={n.x} cy={n.y} r={r + 5} fill="none" stroke="#e6c35c" strokeOpacity="0.6" strokeWidth="1.5" />}
                  {isCold && <text x={n.x + r * 0.72} y={n.y - r * 0.55} textAnchor="middle" fill={COLD_COLOR} fontSize="11" aria-hidden="true">❄</text>}
                  {fr.status !== "none" && fr.status !== "cold" && (
                    <circle cx={n.x + r * 0.72} cy={n.y - r * 0.72} r={4.5} fill={fr.color} stroke="#0c0c0c" strokeWidth="2" />
                  )}
                  <text x={n.x} y={n.y + r + 15} textAnchor="middle" fill="#a3a3a3" fontSize="12" fontWeight="600">
                    {shortName(n.p)}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="text-[10px] text-smoke mt-2">
        Clique sur une personne pour voir ses liens · double-clic pour ouvrir sa fiche · glisse le fond pour te déplacer. Point de couleur : vert = à jour, orange = bientôt, rouge = à recontacter · ❄ = en froid.
      </p>
    </div>
  );
}
