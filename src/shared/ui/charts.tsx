"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { PILLARS } from "@/shared/domain/constants";
import { clamp } from "@/shared/lib/numbers";
import { scoreColor, scoreTextColor } from "@/shared/ui/score-color";

/* ------------------------------------------------------------
   Jauge de puissance (arc 240°)
   ------------------------------------------------------------ */
export function PowerGauge({ value, size = 180, label }: { value: number; size?: number; label?: string }) {
  const r = 60;
  const cx = 75;
  const cy = 75;
  const start = 135;
  const sweep = 270;
  const polar = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = polar(from, r);
    const [x2, y2] = polar(to, r);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const pct = clamp(value, 0, 100) / 100;
  const ticks = Array.from({ length: 28 }, (_, i) => start + (sweep / 27) * i);
  return (
    <div className="relative" style={{ width: size, height: size * 0.82 }}>
      <svg viewBox="0 0 150 150" style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path d={arc(start, start + sweep)} fill="none" stroke="#26262a" strokeWidth="9" strokeLinecap="round" />
        {ticks.map((a, i) => {
          const [x1, y1] = polar(a, r + 8);
          const [x2, y2] = polar(a, r + 11);
          const active = i / 27 <= pct;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? "#f59e0b" : "#2e2e33"} strokeWidth="1.4" />;
        })}
        <motion.path
          d={arc(start, start + sweep)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          initial={{ strokeDasharray: "0 1000" }}
          animate={{ strokeDasharray: `${pct * 4.6 * r} 1000` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <motion.span
          key={Math.round(value)}
          initial={{ opacity: 0.4, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-4xl font-bold text-ash text-glow"
          style={{ fontFamily: "var(--font-mono-family)" }}
        >
          {Math.round(value)}
          <span className="text-lg text-smoke">%</span>
        </motion.span>
        {label && <span className="text-[9px] uppercase tracking-[0.22em] text-smoke mt-1">{label}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Radar hexagonal — 6 piliers
   ------------------------------------------------------------ */
export function RadarChart({
  values,
  compare,
  size = 260,
  onSelect,
}: {
  values: Record<string, number>;
  compare?: Record<string, number> | null;
  size?: number;
  onSelect?: (key: string) => void;
}) {
  const cx = 130;
  const cy = 130;
  const R = 88;
  const n = PILLARS.length;
  const point = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => point(i, (clamp(v, 0, 100) / 100) * R).join(",")).join(" ");
  const main = PILLARS.map((p) => values[p.key] ?? 0);
  const cmp = compare ? PILLARS.map((p) => compare[p.key] ?? 0) : null;

  const rings = useMemo(() => [0.25, 0.5, 0.75, 1].map((f) => Array.from({ length: n }, (_, i) => point(i, R * f).join(",")).join(" ")), [n, R]);

  return (
    <svg viewBox="0 0 260 260" style={{ width: size, height: size, maxWidth: "100%" }}>
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#26262a" strokeWidth="1" />
      ))}
      {PILLARS.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#26262a" strokeWidth="1" />;
      })}
      {cmp && (
        <polygon points={poly(cmp)} fill="rgba(139,140,248,0.12)" stroke="#8b8cf8" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="4 3" />
      )}
      <motion.polygon
        points={poly(main)}
        fill="rgba(245,158,11,0.22)"
        stroke="#f59e0b"
        strokeWidth="1.8"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "130px 130px", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.35))" }}
      />
      {PILLARS.map((p, i) => {
        const [x, y] = point(i, R + 22);
        const val = values[p.key] ?? 0;
        return (
          <g
            key={p.key}
            onClick={() => onSelect?.(p.key)}
            className={onSelect ? "cursor-pointer" : ""}
            {...(onSelect
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": `${p.short} : ${Math.round(val)}`,
                  onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(p.key)),
                }
              : {})}
          >
            <circle cx={point(i, (clamp(main[i], 0, 100) / 100) * R)[0]} cy={point(i, (clamp(main[i], 0, 100) / 100) * R)[1]} r="3" fill="#fbbf24" />
            <text x={x} y={y - 2} textAnchor="middle" fill="#a3a3a3" fontSize="8.5" fontWeight="600" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {p.short}
            </text>
            <text x={x} y={y + 9} textAnchor="middle" fill={scoreTextColor(val)} fontSize="9.5" fontWeight="700">
              {Math.round(val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------
   Calendrier mensuel heatmap
   ------------------------------------------------------------ */
export function MonthGrid({
  month,
  scores,
  onSelect,
  selected,
}: {
  month: string; // YYYY-MM
  scores: Map<string, number>;
  onSelect?: (date: string) => void;
  selected?: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const dim = new Date(y, m, 0).getDate();
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lundi = 0
  const cells: ({ key: string; day: number } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: dim }, (_, i) => ({ key: `${month}-${String(i + 1).padStart(2, "0")}`, day: i + 1 })),
  ];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-smoke font-semibold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) =>
          c ? (
            <button
              key={i}
              onClick={() => onSelect?.(c.key)}
              className={`aspect-square rounded-md text-[10px] font-semibold flex items-center justify-center transition-all hover:ring-1 hover:ring-ember/60 ${
                selected === c.key ? "ring-2 ring-ember" : ""
              }`}
              style={{
                background: scores.has(c.key) ? scoreColor(scores.get(c.key) ?? 0) : "#17171a",
                color: (scores.get(c.key) ?? 0) > 50 ? "#0a0a0a" : "#a0a0a0",
              }}
            >
              {c.day}
            </button>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Courbe d'évolution (scores quotidiens)
   ------------------------------------------------------------ */
export function ScoreLine({ points, height = 90 }: { points: { label: string; value: number | null }[]; height?: number }) {
  const w = 600;
  const h = height;
  const pad = 4;
  const valid = points.filter((p) => p.value !== null) as { label: string; value: number }[];
  if (valid.length === 0) {
    return <div className="text-[11px] text-smoke py-6 text-center">Aucune donnée sur la période.</div>;
  }
  const pts = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
    const y = p.value === null ? null : h - 6 - (clamp(p.value, 0, 100) / 100) * (h - 14);
    return { x, y, v: p.value };
  });
  const usable = pts.filter((p) => p.y !== null) as { x: number; y: number; v: number }[];
  const path = usable.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${usable[usable.length - 1].x} ${h} L ${usable[0].x} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(245,158,11,0.3)" />
          <stop offset="100%" stopColor="rgba(245,158,11,0)" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((v) => {
        const y = h - 6 - (v / 100) * (h - 14);
        return <line key={v} x1={0} x2={w} y1={y} y2={y} stroke="#26262a" strokeWidth="1" strokeDasharray="3 4" />;
      })}
      <motion.path d={area} fill="url(#lineFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
      <motion.path
        d={path}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 5px rgba(245,158,11,0.5))" }}
      />
      {usable.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.4" fill="#fbbf24" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------
   Barres horizontales simples
   ------------------------------------------------------------ */
export function Bars({ data, max }: { data: { label: string; value: number; color?: string }[]; max?: number }) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[10px] text-dust w-24 min-w-0 truncate">{d.label}</span>
          <div className="flex-1 min-w-0 h-3.5 rounded bg-[#17171a] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (d.value / m) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded"
              style={{ background: d.color ?? "#f59e0b", boxShadow: `0 0 8px ${d.color ?? "#f59e0b"}55` }}
            />
          </div>
          {/* Grows with long values instead of overflowing onto the bar. */}
          <span className="text-[10px] font-semibold text-ash min-w-10 shrink-0 text-right tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
