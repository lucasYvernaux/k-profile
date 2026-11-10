"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplets, RotateCcw } from "lucide-react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Minus, Plus, Gears as Settings2, Trash as Trash2 } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, Field, Input, EmptyState, ProgressBar } from "@/shared/ui/primitives";
import { Bars, ScoreLine } from "@/shared/ui/charts";
import { DynIcon } from "@/shared/ui/icon";
import {
  DEFAULT_CONFIG, DRINK_PRESETS, KIND_META, caffeineRemaining, estimateBac, estimateBacExtended,
  expectedWaterAt, formatAmount, formatDuration, gramsOfAlcohol, gramsToUnits, minutesUntilBelow, widmarkR,
  type IntakeConfig, type IntakeKind, type Preset,
} from "@/features/intake/domain/intake";
import { addDays, formatKeyFr, todayKey, weekdayName } from "@/shared/lib/dates";
import { apiFetch } from "@/shared/lib/api-client";

type Log = {
  id: number; date: string; kind: string; amount: number; label: string | null;
  hour: number; minute: number; volumeCl: number | null; abv: number | null; grams: number | null;
};

/* ---------- Alcootest : jauge d'alcoolémie ---------- */
function BacGauge({ bac, limit }: { bac: number; limit: number }) {
  const max = Math.max(1.2, limit * 2, bac * 1.15);
  const pct = Math.min(100, (bac / max) * 100);
  const limitPct = Math.min(100, (limit / max) * 100);
  const over = bac > limit;
  const color = bac === 0 ? "#10b981" : over ? "#f87171" : bac > limit * 0.6 ? "#d4af37" : "#10b981";
  return (
    <div>
      <div className="flex items-baseline justify-center gap-2 mb-3">
        <span className="font-display text-5xl font-bold tabular-nums" style={{ color, textShadow: `0 0 24px ${color}66`, fontFamily: "var(--font-mono-family)" }}>
          {bac.toFixed(2)}
        </span>
        <span className="text-base text-smoke">g/L</span>
      </div>
      <div className="relative h-3 rounded-full bg-[#101010] border border-line overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}bb, ${color})`, boxShadow: `0 0 10px ${color}88` }}
        />
        <div className="absolute top-0 bottom-0 w-[2px] bg-blood" style={{ left: `${limitPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-smoke mt-1.5">
        <span>0</span>
        <span className="text-blood">seuil légal {limit.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}

/* ---------- Verre d'hydratation animé ---------- */
function WaterVessel({ pct, total, goal }: { pct: number; total: number; goal: number }) {
  const fill = Math.min(100, pct);
  return (
    <div className="relative w-[132px] h-[168px] mx-auto">
      <svg viewBox="0 0 120 150" className="w-full h-full">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <clipPath id="vessel">
            <path d="M22 10 L98 10 L88 140 Q87 146 80 146 L40 146 Q33 146 32 140 Z" />
          </clipPath>
        </defs>
        <path d="M22 10 L98 10 L88 140 Q87 146 80 146 L40 146 Q33 146 32 140 Z" fill="#101013" stroke="#26262a" strokeWidth="2" />
        <g clipPath="url(#vessel)">
          <motion.rect
            x="0" width="120" fill="url(#waterGrad)" opacity="0.85"
            initial={{ y: 150, height: 0 }}
            animate={{ y: 150 - (fill / 100) * 140, height: (fill / 100) * 140 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.ellipse
            cx="60" rx="42" ry="4" fill="#bae6fd" opacity="0.7"
            initial={{ cy: 150 }}
            animate={{ cy: 150 - (fill / 100) * 140 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </g>
        {[25, 50, 75].map((m) => (
          <line key={m} x1={30} x2={44} y1={150 - (m / 100) * 140} y2={150 - (m / 100) * 140} stroke="#3f3f46" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" style={{ fontFamily: "var(--font-mono-family)" }}>
          {(total / 1000).toFixed(2).replace(/0$/, "")}
          <span className="text-sm"> L</span>
        </span>
        <span className="text-[9px] text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">sur {(goal / 1000).toFixed(1)} L</span>
      </div>
    </div>
  );
}

/* --------- carte d'une substance ---------
 * Declared outside IntakePage: a component created during render is a new type on every
 * render, so React remounted the whole card each time and the "Autre" button lost the
 * focus returned to it when its dialog closed (WCAG 2.4.3). */
function Tile({
  kind,
  subtitle,
  presets,
  onAdd,
  onCustom,
  children,
}: {
  kind: IntakeKind;
  subtitle: string;
  presets: Preset[];
  onAdd: (kind: IntakeKind, amount: number, label: string) => void;
  onCustom: (kind: IntakeKind) => void;
  children: React.ReactNode;
}) {
  const meta = KIND_META[kind];
  return (
    <Card className="h-full">
      <SectionTitle icon={meta.icon} title={meta.name} sub={subtitle} />
      {children}
      <div className="mt-4 pt-3 border-t border-line">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <motion.button
              key={p.label}
              whileTap={{ scale: 0.93 }}
              onClick={() => onAdd(kind, p.amount, p.label)}
              className="flex items-center gap-1.5 text-[10.5px] px-2.5 py-1.5 rounded-lg border border-line text-dust hover:text-ash transition-all"
              style={{ borderColor: `${meta.color}33` }}
            >
              <DynIcon name={p.icon} className="w-3 h-3" style={{ color: meta.color }} />
              {p.label}
              <span className="text-smoke">{formatAmount(kind, p.amount)}</span>
            </motion.button>
          ))}
          <button onClick={() => onCustom(kind)}
            className="text-[10.5px] px-2.5 py-1.5 rounded-lg border border-dashed border-line2 text-smoke hover:text-ember hover:border-ember/50 transition-all flex items-center gap-1">
            <Plus className="w-3 h-3" /> Autre
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function IntakePage() {
  const [date, setDate] = useState(todayKey());
  const [cfg, setCfg] = useState<IntakeConfig>(DEFAULT_CONFIG);
  const [today, setToday] = useState<Log[]>([]);
  const [range, setRange] = useState<Log[]>([]);
  const [now, setNow] = useState(new Date());
  const [custom, setCustom] = useState<{ kind: IntakeKind; amount: string } | null>(null);
  const openCustom = (kind: IntakeKind) => setCustom({ kind, amount: "" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<IntakeConfig>(DEFAULT_CONFIG);
  const [drink, setDrink] = useState({ volumeCl: "", abv: "", label: "" });

  const from = addDays(date, -13);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/intake?date=${date}&from=${addDays(date, -13)}&to=${date}`, { cache: "no-store" });
    const d = await res.json();
    setCfg(d.config);
    setDraft(d.config);
    setToday(d.today);
    setRange(d.range);
  }, [date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const totals = useMemo(() => {
    const sum = (k: string) => today.filter((l) => l.kind === k).reduce((s, l) => s + l.amount, 0);
    return { water: sum("water"), caffeine: sum("caffeine"), alcohol: sum("alcohol") };
  }, [today]);

  const isToday = date === todayKey();
  const h = isToday ? now.getHours() : 23;
  const m = isToday ? now.getMinutes() : 59;

  const expected = expectedWaterAt(cfg, h, m);
  const waterDeficit = Math.max(0, expected - totals.water);
  const caffLogs = today.filter((l) => l.kind === "caffeine").map((l) => ({ amount: l.amount, hour: l.hour, minute: l.minute }));
  const caffNow = caffeineRemaining(caffLogs, h, m);
  const [bh, bm] = "22:00".split(":").map(Number);
  const caffAtBed = caffeineRemaining(caffLogs, bh, bm);
  const lateCaffeine = today.some((l) => l.kind === "caffeine" && l.hour * 60 + l.minute > Number(cfg.caffeineCutoff.split(":")[0]) * 60 + Number(cfg.caffeineCutoff.split(":")[1]));

  // Semaine glissante d'alcool
  const weekAlcohol = useMemo(() => {
    const start = addDays(date, -6);
    return range.filter((l) => l.kind === "alcohol" && l.date >= start && l.date <= date).reduce((s, l) => s + l.amount, 0);
  }, [range, date]);

  /* ---------- Alcoolémie (Widmark) ---------- */
  const drinkEvents = useMemo(
    () =>
      today
        .filter((l) => l.kind === "alcohol")
        .map((l) => ({ grams: l.grams ?? l.amount * 10, hour: l.hour, minute: l.minute })),
    [today]
  );
  const gramsToday = useMemo(() => drinkEvents.reduce((s, d) => s + d.grams, 0), [drinkEvents]);
  const bacNow = useMemo(
    () => estimateBac(drinkEvents, cfg.bodyWeightKg, cfg.bodySex, h, m),
    [drinkEvents, cfg.bodyWeightKg, cfg.bodySex, h, m]
  );
  const minUntilLegal = useMemo(
    () => (bacNow > cfg.legalLimit ? minutesUntilBelow(drinkEvents, cfg.bodyWeightKg, cfg.bodySex, h, m, cfg.legalLimit) : 0),
    [bacNow, drinkEvents, cfg, h, m]
  );
  const minUntilSober = useMemo(
    () => (bacNow > 0 ? minutesUntilBelow(drinkEvents, cfg.bodyWeightKg, cfg.bodySex, h, m, 0.01) : 0),
    [bacNow, drinkEvents, cfg, h, m]
  );
  const bacCurve = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hr) => ({
        label: `${hr}h`,
        value: Math.round(estimateBacExtended(drinkEvents, cfg.bodyWeightKg, cfg.bodySex, hr * 60) * 100) / 100,
      })),
    [drinkEvents, cfg.bodyWeightKg, cfg.bodySex]
  );

  async function addDrink(volumeCl: number, abv: number, label: string) {
    await apiFetch("/api/intake", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "alcohol", volumeCl, abv, label, date }),
    });
    load();
  }

  const dryDays = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 14; i++) {
      const d = addDays(date, -i);
      const has = range.some((l) => l.kind === "alcohol" && l.date === d && l.amount > 0);
      if (has) break;
      n++;
    }
    return n;
  }, [range, date]);

  async function add(kind: IntakeKind, amount: number, label?: string) {
    await apiFetch("/api/intake", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, amount, label, date }),
    });
    load();
  }
  async function remove(id: number) {
    await apiFetch(`/api/intake?id=${id}`, { method: "DELETE" });
    load();
  }
  async function saveCfg() {
    const res = await apiFetch("/api/intake/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    setCfg(await res.json());
    setSettingsOpen(false);
    load();
  }

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(from, i)), [from]);
  const seriesOf = (kind: IntakeKind) => days.map((d) => ({
    label: d.slice(8),
    value: range.filter((l) => l.kind === kind && l.date === d).reduce((s, l) => s + l.amount, 0) || (d <= todayKey() ? 0 : null),
  }));

  const waterPct = (totals.water / cfg.waterGoal) * 100;
  const caffPct = (totals.caffeine / cfg.caffeineLimit) * 100;
  const alcPct = (weekAlcohol / cfg.alcoholWeeklyLimit) * 100;

  return (
    <ScreenFrame title="L'Intendance">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">L'Intendance — Eau · Caféine · Alcool</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash capitalize">{formatKeyFr(date)}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setDate(addDays(date, -1))} aria-label="Jour précédent" className="p-2 rounded-lg text-smoke hover:text-ash border border-line"><ChevronLeft className="w-4 h-4" /></button>
          {!isToday && <button onClick={() => setDate(todayKey())} className="text-[11px] px-3 rounded-lg text-dust hover:text-ash border border-line">Aujourd'hui</button>}
          <button onClick={() => setDate(addDays(date, 1))} aria-label="Jour suivant" disabled={date >= todayKey()} className="p-2 rounded-lg text-smoke hover:text-ash border border-line disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          <Btn small onClick={() => setSettingsOpen(true)}><Settings2 className="w-3.5 h-3.5" /> Objectifs</Btn>
        </div>
      </div>

      {/* ===== ALERTES ===== */}
      <div className="space-y-2 mb-4">
        {isToday && waterDeficit >= 200 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/[0.07] px-4 py-3">
            <Droplets className="w-4 h-4 text-[#38bdf8] shrink-0" />
            <p className="text-[12px] text-ash flex-1">
              <span className="font-semibold text-[#38bdf8]">Retard d'hydratation : {formatAmount("water", waterDeficit)}.</span>
              {" "}À {String(h).padStart(2, "0")}h tu devrais être à {formatAmount("water", expected)}.
            </p>
            <Btn small variant="outline" onClick={() => add("water", 250, "Verre")}>+ 250 ml</Btn>
          </motion.div>
        )}
        {totals.caffeine > cfg.caffeineLimit && (
          <div className="flex items-center gap-3 rounded-xl border border-blood/35 bg-blood/[0.07] px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-blood shrink-0" />
            <p className="text-[12px] text-ash">Limite de caféine dépassée : <span className="font-semibold text-blood">{Math.round(totals.caffeine)} mg</span> sur {cfg.caffeineLimit} mg.</p>
          </div>
        )}
        {lateCaffeine && (
          <div className="flex items-center gap-3 rounded-xl border border-ember/35 bg-ember/[0.07] px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-ember shrink-0" />
            <p className="text-[12px] text-ash">Caféine prise après {cfg.caffeineCutoff} — environ <span className="font-semibold text-ember">{caffAtBed} mg</span> encore actifs à 22h. Sommeil menacé.</p>
          </div>
        )}
        {weekAlcohol > cfg.alcoholWeeklyLimit && (
          <div className="flex items-center gap-3 rounded-xl border border-blood/35 bg-blood/[0.07] px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-blood shrink-0" />
            <p className="text-[12px] text-ash">Plafond hebdomadaire d'alcool dépassé : <span className="font-semibold text-blood">{weekAlcohol.toFixed(1)} u.</span> sur {cfg.alcoholWeeklyLimit}.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== EAU ===== */}
        <Tile kind="water" subtitle={isToday ? "Aujourd'hui" : formatKeyFr(date)} presets={cfg.presets.water} onAdd={add} onCustom={openCustom}>
          <WaterVessel pct={waterPct} total={totals.water} goal={cfg.waterGoal} />
          <div className="mt-3 space-y-2">
            <ProgressBar value={waterPct} color="#38bdf8" />
            <div className="flex justify-between text-[10.5px]">
              <span className="text-smoke">Cadence attendue à cette heure</span>
              <span className={waterDeficit > 0 ? "text-[#38bdf8] font-semibold" : "text-jade font-semibold"}>
                {waterDeficit > 0 ? `−${formatAmount("water", waterDeficit)}` : "à jour ✓"}
              </span>
            </div>
            <div className="flex justify-between text-[10.5px]">
              <span className="text-smoke">Restant pour l'objectif</span>
              <span className="text-ash font-semibold">{formatAmount("water", Math.max(0, cfg.waterGoal - totals.water))}</span>
            </div>
          </div>
        </Tile>

        {/* ===== CAFÉINE ===== */}
        <Tile kind="caffeine" subtitle={isToday ? "Aujourd'hui" : formatKeyFr(date)} presets={cfg.presets.caffeine} onAdd={add} onCustom={openCustom}>
          <div className="text-center py-2">
            <span className="font-display text-4xl font-bold text-flame text-glow" style={{ fontFamily: "var(--font-mono-family)" }}>
              {Math.round(totals.caffeine)}
            </span>
            <span className="text-lg text-smoke"> / {cfg.caffeineLimit} mg</span>
          </div>
          <ProgressBar value={caffPct} color={caffPct > 100 ? "#f87171" : "#d4af37"} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
              <p className="font-display text-base font-bold text-ash">{caffNow} mg</p>
              <p className="text-[8.5px] uppercase tracking-widest text-smoke mt-0.5">Actifs maintenant</p>
            </div>
            <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
              <p className={`font-display text-base font-bold ${caffAtBed > 50 ? "text-blood" : "text-jade"}`}>{caffAtBed} mg</p>
              <p className="text-[8.5px] uppercase tracking-widest text-smoke mt-0.5">Au coucher (22h)</p>
            </div>
          </div>
          <p className="text-[10px] text-smoke mt-2 text-center">Demi-vie 5 h · heure limite {cfg.caffeineCutoff}</p>
        </Tile>

        {/* ===== ALCOOL ===== */}
        <Tile kind="alcohol" subtitle={isToday ? "Aujourd'hui" : formatKeyFr(date)} presets={cfg.presets.alcohol} onAdd={add} onCustom={openCustom}>
          <div className="text-center py-2">
            <span className={`font-display text-4xl font-bold ${totals.alcohol > cfg.alcoholDailyLimit ? "text-blood" : totals.alcohol > 0 ? "text-ember" : "text-jade"}`} style={{ fontFamily: "var(--font-mono-family)" }}>
              {Number(totals.alcohol.toFixed(1))}
            </span>
            <span className="text-lg text-smoke"> / {cfg.alcoholDailyLimit} u.</span>
          </div>
          <ProgressBar value={(totals.alcohol / Math.max(1, cfg.alcoholDailyLimit)) * 100} color={totals.alcohol > cfg.alcoholDailyLimit ? "#f87171" : "#10b981"} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
              <p className={`font-display text-base font-bold ${alcPct > 100 ? "text-blood" : "text-ash"}`}>{weekAlcohol.toFixed(1)}</p>
              <p className="text-[8.5px] uppercase tracking-widest text-smoke mt-0.5">7 j / {cfg.alcoholWeeklyLimit} u.</p>
            </div>
            <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
              <p className="font-display text-base font-bold text-jade">{dryDays}</p>
              <p className="text-[8.5px] uppercase tracking-widest text-smoke mt-0.5">Jours sans</p>
            </div>
          </div>
          <p className="text-[10px] text-smoke mt-2 text-center">1 unité = 10 g d'alcool pur</p>
        </Tile>
      </div>

      {/* ===== ALCOOTEST ===== */}
      <Card className="mt-4" hairline>
        <SectionTitle
          icon="gauge"
          title="Alcootest — Alcoolémie estimée"
          sub={`Formule de Widmark · ${cfg.bodyWeightKg} kg · ${cfg.bodySex} · élimination 0,15 g/L par heure`}
          right={<Btn small onClick={() => { setDraft(cfg); setSettingsOpen(true); }}><Settings2 className="w-3.5 h-3.5" /> Profil</Btn>}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Jauge + projections */}
          <div className="lg:col-span-1">
            <BacGauge bac={bacNow} limit={cfg.legalLimit} />
            <div className="mt-4 space-y-2">
              <div className={`rounded-xl border px-3.5 py-3 ${bacNow > cfg.legalLimit ? "border-blood/40 bg-blood/[0.07]" : bacNow > 0 ? "border-ember/35 bg-ember/[0.05]" : "border-jade/35 bg-jade/[0.05]"}`}>
                <p className="text-[12px] font-semibold" style={{ color: bacNow > cfg.legalLimit ? "#f87171" : bacNow > 0 ? "#d4af37" : "#10b981" }}>
                  {bacNow > cfg.legalLimit ? "CONDUITE INTERDITE" : bacNow > 0 ? "Alcool présent dans le sang" : "Sobre"}
                </p>
                {bacNow > 0 && (
                  <div className="text-[11px] text-dust mt-1.5 space-y-0.5">
                    <p>Sous le seuil de {cfg.legalLimit.toFixed(1)} g/L dans : <span className="text-ash font-semibold">{formatDuration(minUntilLegal)}</span></p>
                    <p>Sobriété complète dans : <span className="text-ash font-semibold">{formatDuration(minUntilSober)}</span></p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
                  <p className="font-display text-base font-bold text-ash">{Math.round(gramsToday)} g</p>
                  <p className="text-[8.5px] uppercase tracking-widest text-smoke mt-0.5">Alcool pur ingéré</p>
                </div>
                <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
                  <p className="font-display text-base font-bold text-ash">{Number(totals.alcohol.toFixed(1))}</p>
                  <p className="text-[8.5px] uppercase tracking-widest text-smoke mt-0.5">Unités standard</p>
                </div>
              </div>
            </div>
          </div>

          {/* Saisie format étiquette */}
          <div className="lg:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Ajouter une boisson — comme sur l'étiquette</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {DRINK_PRESETS.map((d) => (
                <motion.button
                  key={d.label}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => addDrink(d.volumeCl, d.abv, d.label)}
                  className="flex items-center gap-1.5 text-[10.5px] px-2.5 py-1.5 rounded-lg border border-blood/25 text-dust hover:text-ash hover:border-blood/50 transition-all"
                >
                  <DynIcon name={d.icon} className="w-3 h-3 text-blood" />
                  {d.label}
                  <span className="text-smoke">{d.volumeCl} cL · {d.abv}°</span>
                </motion.button>
              ))}
            </div>

            <div className="rounded-xl border border-line bg-raise/20 p-4">
              <p className="text-[11px] text-dust mb-3">Saisie personnalisée — lis le volume et le degré directement sur la bouteille :</p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Volume (cL)">
                  <Input type="number" step="any" value={drink.volumeCl} onChange={(e) => setDrink({ ...drink, volumeCl: e.target.value })} placeholder="33" className="w-24" />
                </Field>
                <Field label="Degré (% vol)">
                  <Input type="number" step="any" value={drink.abv} onChange={(e) => setDrink({ ...drink, abv: e.target.value })} placeholder="5.5" className="w-24" />
                </Field>
                <Field label="Nom (optionnel)">
                  <Input value={drink.label} onChange={(e) => setDrink({ ...drink, label: e.target.value })} placeholder="IPA artisanale" className="w-40" />
                </Field>
                <Btn
                  variant="primary"
                  onClick={() => {
                    const v = Number(drink.volumeCl), a = Number(drink.abv);
                    if (v > 0 && a > 0) { addDrink(v, a, drink.label || `${v} cL à ${a}°`); setDrink({ volumeCl: "", abv: "", label: "" }); }
                  }}
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </Btn>
              </div>
              {Number(drink.volumeCl) > 0 && Number(drink.abv) > 0 && (
                <p className="text-[11px] text-ember mt-3">
                  ≈ <span className="font-semibold">{gramsOfAlcohol(Number(drink.volumeCl), Number(drink.abv)).toFixed(1)} g</span> d'alcool pur
                  {" · "}{gramsToUnits(gramsOfAlcohol(Number(drink.volumeCl), Number(drink.abv))).toFixed(2)} unité(s)
                  {" · "}pic estimé +{(gramsOfAlcohol(Number(drink.volumeCl), Number(drink.abv)) / (cfg.bodyWeightKg * widmarkR(cfg.bodySex))).toFixed(2)} g/L
                </p>
              )}
            </div>

            {/* Courbe d'alcoolémie sur la journée */}
            {bacCurve.some((p) => (p.value ?? 0) > 0) && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Courbe d'alcoolémie (heure par heure)</p>
                <ScoreLine
                  points={bacCurve.map((p) => ({
                    label: p.label,
                    value: Math.min(100, (p.value / Math.max(1.2, cfg.legalLimit * 2, bacNow * 1.15)) * 100),
                  }))}
                  height={90}
                />
                <div className="flex justify-between text-[9px] text-smoke mt-1">
                  <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 mt-4 rounded-lg border border-ember/25 bg-ember/[0.04] px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-ember shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-smoke leading-relaxed">
                <span className="text-dust font-semibold">Estimation indicative uniquement.</span> L'alcoolémie réelle varie selon le repas, la fatigue, le métabolisme et les médicaments.
                Ce calcul ne remplace <span className="text-ember">jamais</span> un éthylotest homologué et ne doit jamais servir à décider de prendre le volant.
                En cas de doute : ne conduis pas.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ===== JOURNAL DU JOUR ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <SectionTitle icon="list" title="Journal du jour" sub={`${today.length} saisie(s)`} />
          {today.length === 0 ? (
            <EmptyState icon="droplets" title="Aucune saisie." sub="Utilise les boutons rapides pour enregistrer." />
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {today.map((l) => {
                  const meta = KIND_META[l.kind as IntakeKind];
                  return (
                    <motion.div key={l.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 bg-raise/30 border border-line rounded-lg px-3 py-2 group">
                      <span className="font-display text-[11px] text-smoke tabular-nums w-10" style={{ fontFamily: "var(--font-mono-family)" }}>
                        {String(l.hour).padStart(2, "0")}:{String(l.minute).padStart(2, "0")}
                      </span>
                      <DynIcon name={meta?.icon ?? "circle"} className="w-3.5 h-3.5 shrink-0" style={{ color: meta?.color }} />
                      <span className="text-[12px] text-ash flex-1 truncate">
                        {l.label ?? meta?.name}
                        {l.volumeCl && l.abv ? <span className="text-smoke text-[10px]"> · {l.volumeCl} cL à {l.abv}°</span> : null}
                      </span>
                      <span className="text-[11.5px] font-semibold" style={{ color: meta?.color }}>
                        {l.kind === "alcohol" && l.grams ? `${l.grams.toFixed(1)} g` : formatAmount(l.kind as IntakeKind, l.amount)}
                      </span>
                      <button onClick={() => remove(l.id)} aria-label={`Supprimer « ${l.label ?? meta?.name ?? "cette entrée"} »`} className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 p-1 text-smoke hover:text-blood transition-all"><Trash2 className="w-3 h-3" /></button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon="trending-up" title="Tendance — 14 jours" sub="Hydratation quotidienne (ml)" />
          <ScoreLine points={seriesOf("water").map((p) => ({ label: p.label, value: p.value === null ? null : Math.min(100, (p.value / cfg.waterGoal) * 100) }))} height={110} />
          <div className="mt-4 pt-3 border-t border-line space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Caféine (mg / jour)</p>
              <Bars data={days.slice(-7).map((d) => ({
                label: weekdayName(d) + " " + d.slice(8),
                value: Math.round(range.filter((l) => l.kind === "caffeine" && l.date === d).reduce((s, l) => s + l.amount, 0)),
                color: "#d4af37",
              }))} max={Math.max(cfg.caffeineLimit, 1)} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Alcool (unités / jour)</p>
              <Bars data={days.slice(-7).map((d) => ({
                label: weekdayName(d) + " " + d.slice(8),
                value: Number(range.filter((l) => l.kind === "alcohol" && l.date === d).reduce((s, l) => s + l.amount, 0).toFixed(1)),
                color: "#f87171",
              }))} max={Math.max(cfg.alcoholDailyLimit * 2, 2)} />
            </div>
          </div>
        </Card>
      </div>

      {/* ===== MODAL SAISIE LIBRE ===== */}
      <Modal open={Boolean(custom)} onClose={() => setCustom(null)} title={custom ? `Ajouter — ${KIND_META[custom.kind].name}` : ""}>
        {custom && (
          <div className="space-y-4">
            <Field label={`Quantité (${KIND_META[custom.kind].unit})`}>
              <Input type="number" step="any" autoFocus value={custom.amount} onChange={(e) => setCustom({ ...custom, amount: e.target.value })}
                placeholder={custom.kind === "water" ? "350" : custom.kind === "caffeine" ? "75" : "1.5"} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setCustom(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={() => { const a = Number(custom.amount); if (a > 0) { add(custom.kind, a, "Saisie libre"); setCustom(null); } }}>
                <Check className="w-4 h-4" /> Enregistrer
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== MODAL RÉGLAGES ===== */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Objectifs & limites" wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Objectif d'eau (ml / jour)">
            <Input type="number" value={draft.waterGoal} onChange={(e) => setDraft({ ...draft, waterGoal: Number(e.target.value) })} />
          </Field>
          <Field label="Rappel si retard — intervalle (min)">
            <Input type="number" value={draft.waterReminderMin} onChange={(e) => setDraft({ ...draft, waterReminderMin: Number(e.target.value) })} />
          </Field>
          <Field label="Début de la fenêtre d'hydratation">
            <Input type="time" value={draft.waterStart} onChange={(e) => setDraft({ ...draft, waterStart: e.target.value })} />
          </Field>
          <Field label="Fin de la fenêtre">
            <Input type="time" value={draft.waterEnd} onChange={(e) => setDraft({ ...draft, waterEnd: e.target.value })} />
          </Field>
          <Field label="Limite de caféine (mg / jour)">
            <Input type="number" value={draft.caffeineLimit} onChange={(e) => setDraft({ ...draft, caffeineLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Heure limite de caféine">
            <Input type="time" value={draft.caffeineCutoff} onChange={(e) => setDraft({ ...draft, caffeineCutoff: e.target.value })} />
          </Field>
          <Field label="Limite d'alcool (unités / jour)">
            <Input type="number" step="any" value={draft.alcoholDailyLimit} onChange={(e) => setDraft({ ...draft, alcoholDailyLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Limite d'alcool (unités / semaine)">
            <Input type="number" step="any" value={draft.alcoholWeeklyLimit} onChange={(e) => setDraft({ ...draft, alcoholWeeklyLimit: Number(e.target.value) })} />
          </Field>

          {/* Profil corporel pour l'alcootest */}
          <div className="sm:col-span-2 pt-3 border-t border-line">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ember mb-1">Profil corporel — calcul d'alcoolémie</p>
            <p className="text-[10px] text-smoke mb-3">Ces valeurs conditionnent la précision de l'estimation (formule de Widmark).</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Poids (kg)">
                <Input type="number" step="any" value={draft.bodyWeightKg} onChange={(e) => setDraft({ ...draft, bodyWeightKg: Number(e.target.value) })} />
              </Field>
              <Field label="Métabolisme de référence">
                <div className="flex gap-1.5">
                  {(["homme", "femme"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setDraft({ ...draft, bodySex: s })}
                      className={`flex-1 text-[11px] py-2 rounded-lg border capitalize transition-all ${draft.bodySex === s ? "border-ember bg-ember/15 text-ember font-semibold" : "border-line text-smoke hover:text-dust"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Seuil légal (g/L)">
                <div className="flex gap-1.5">
                  {[0.5, 0.2].map((v) => (
                    <button key={v} type="button" onClick={() => setDraft({ ...draft, legalLimit: v })}
                      className={`flex-1 text-[10.5px] py-2 rounded-lg border transition-all ${draft.legalLimit === v ? "border-ember bg-ember/15 text-ember font-semibold" : "border-line text-smoke hover:text-dust"}`}>
                      {v.toFixed(1)}{v === 0.2 ? " (probatoire)" : ""}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* CRUD des boutons rapides */}
          {(["water", "caffeine", "alcohol"] as IntakeKind[]).map((k) => (
            <div key={k} className="sm:col-span-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Boutons rapides — {KIND_META[k].name} ({KIND_META[k].unit})</p>
              <div className="space-y-1.5">
                {draft.presets[k].map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input aria-label={`Libellé du bouton rapide ${i + 1}`} value={p.label} onChange={(e) => {
                      const next = [...draft.presets[k]]; next[i] = { ...p, label: e.target.value };
                      setDraft({ ...draft, presets: { ...draft.presets, [k]: next } });
                    }} className="flex-1" />
                    <Input type="number" step="any" aria-label={`Quantité du bouton rapide ${i + 1} (${KIND_META[k].unit})`} value={p.amount} onChange={(e) => {
                      const next = [...draft.presets[k]]; next[i] = { ...p, amount: Number(e.target.value) };
                      setDraft({ ...draft, presets: { ...draft.presets, [k]: next } });
                    }} className="w-24" />
                    <button onClick={() => setDraft({ ...draft, presets: { ...draft.presets, [k]: draft.presets[k].filter((_, j) => j !== i) } })}
                      aria-label={`Retirer le bouton rapide « ${p.label || i + 1} »`} className="p-2 rounded-lg text-smoke hover:text-blood"><Minus className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => {
                  const np: Preset = { label: "Nouveau", amount: k === "water" ? 250 : k === "caffeine" ? 60 : 1, icon: KIND_META[k].icon };
                  setDraft({ ...draft, presets: { ...draft.presets, [k]: [...draft.presets[k], np] } });
                }} className="text-[10.5px] text-ember hover:text-flame flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter un bouton</button>
              </div>
            </div>
          ))}

          <div className="sm:col-span-2 flex items-center justify-between pt-3 border-t border-line">
            <Btn small onClick={async () => { const r = await apiFetch("/api/intake/config", { method: "DELETE" }); const d = await r.json(); setDraft(d); setCfg(d); }}>
              <RotateCcw className="w-3.5 h-3.5" /> Réglages d'usine
            </Btn>
            <Btn variant="primary" onClick={saveCfg}><Check className="w-4 h-4" /> Enregistrer</Btn>
          </div>
        </div>
      </Modal>
    </ScreenFrame>
  );
}
