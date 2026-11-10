"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pen as Pencil, Plus, Gears as Settings2, Trash as Trash2, Cross as X } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, Field, Input, Select, Textarea, Slider, EmptyState, ProgressBar } from "@/shared/ui/primitives";
import { Bars } from "@/shared/ui/charts";
import BlurText from "@/shared/ui/react-bits/BlurText";
import { DynIcon } from "@/shared/ui/icon";
import {
  BODYWEIGHT_EXERCISES, DEFAULT_SANTE, MEASURES, WORKOUT_TYPES, bmi, bmiCategory, bodyWeightOn, bodyweightInfo,
  bodyweightRecords, bodyweightTotals, fmt, formatSeconds, navyBodyFat, parseExercises, typeMeta, volumeOf,
  type BodyMetric, type Exercise, type SanteConfig, type Workout,
} from "@/features/health/domain/health";
import { addDays, diffDays, formatKeyFr, parseKey, todayKey, weekStartOf } from "@/shared/lib/dates";
import { apiFetch } from "@/shared/lib/api-client";

const MONO = { fontFamily: "var(--font-mono-family)" };

type MetricKey = "weightKg" | "bodyFatPct" | "bmi" | (typeof MEASURES)[number]["key"];

const METRIC_LABELS: Record<MetricKey, { label: string; unit: string }> = {
  weightKg: { label: "Poids", unit: "kg" },
  bodyFatPct: { label: "Masse grasse", unit: "%" },
  bmi: { label: "IMC", unit: "" },
  ...(Object.fromEntries(MEASURES.map((m) => [m.key, { label: m.label, unit: "cm" }])) as Record<
    (typeof MEASURES)[number]["key"],
    { label: string; unit: string }
  >),
};

/* ------------------------------------------------------------
   Courbe à valeurs réelles (axe temps) avec survol
   ------------------------------------------------------------ */
function ValueLine({
  points,
  unit,
  target,
  height = 200,
}: {
  points: { date: string; value: number }[];
  unit: string;
  target?: number | null;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) {
    return <div className="text-[11px] text-smoke py-16 text-center">Aucune donnée sur la période.</div>;
  }
  const w = 640;
  const h = height;
  const padL = 38;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const values = points.map((p) => p.value);
  if (target) values.push(target);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const span = Math.max(max - min, 1);
  min -= span * 0.12;
  max += span * 0.12;
  const t0 = parseKey(points[0].date).getTime();
  const t1 = parseKey(points[points.length - 1].date).getTime();
  const x = (d: string) =>
    points.length === 1 ? (padL + w - padR) / 2 : padL + ((parseKey(d).getTime() - t0) / Math.max(1, t1 - t0)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const pts = points.map((p) => ({ ...p, x: x(p.date), y: y(p.value) }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${h - padB} L ${pts[0].x} ${h - padB} Z`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const hp = hover !== null ? pts[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - mx) < Math.abs(pts[best].x - mx)) best = i;
    });
    setHover(best);
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(212,175,55,0.28)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="#262626" strokeWidth="1" strokeDasharray="3 4" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fill="#a0a0a0" fontSize="9">
              {fmt(v, 1)}
            </text>
          </g>
        ))}
        {target ? (
          <g>
            <line x1={padL} x2={w - padR} y1={y(target)} y2={y(target)} stroke="#10b981" strokeWidth="1.2" strokeDasharray="6 4" />
            <text x={w - padR} y={y(target) - 4} textAnchor="end" fill="#10b981" fontSize="9" fontWeight="600">
              cible {fmt(target)} {unit}
            </text>
          </g>
        ) : null}
        {pts.length > 1 && <motion.path d={area} fill="url(#valFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
        <motion.path
          key={path}
          d={path}
          fill="none"
          stroke="#d4af37"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 5px rgba(212,175,55,0.5))" }}
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 4.5 : 2.6} fill="#e6c35c" />
        ))}
        {hp && <line x1={hp.x} x2={hp.x} y1={padT} y2={h - padB} stroke="#d4af37" strokeOpacity="0.35" />}
        <text x={padL} y={h - 6} fill="#a0a0a0" fontSize="9">
          {formatKeyFr(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={w - padR} y={h - 6} textAnchor="end" fill="#a0a0a0" fontSize="9">
            {formatKeyFr(points[points.length - 1].date)}
          </text>
        )}
      </svg>
      {hp && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-full rounded-lg border border-line2 bg-[#111112]/95 px-2.5 py-1.5 text-center"
          style={{ left: `${(hp.x / w) * 100}%`, top: `${(hp.y / h) * 100}%`, marginTop: -8 }}
        >
          <div className="text-[13px] font-bold text-flame" style={MONO}>
            {fmt(hp.value)} {unit}
          </div>
          <div className="text-[9px] text-smoke whitespace-nowrap">{formatKeyFr(hp.date)}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   Barres verticales : minutes d'entraînement par semaine
   ------------------------------------------------------------ */
function WeekColumns({ data, goal }: { data: { label: string; minutes: number; count: number }[]; goal: number }) {
  const max = Math.max(...data.map((d) => d.minutes), 60);
  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((d, i) => {
        const hit = d.count >= goal;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
            <span className="text-[9px] text-smoke opacity-0 group-hover:opacity-100 transition-opacity" style={MONO}>
              {d.minutes}′
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.minutes / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-t-md min-h-[2px]"
              style={{
                background: hit ? "linear-gradient(180deg,#e6c35c,#d4af37)" : d.minutes ? "#5e4b14" : "#1d1d1d",
                boxShadow: hit ? "0 0 10px rgba(212,175,55,0.35)" : undefined,
              }}
              title={`${d.count} séance(s) · ${d.minutes} min`}
            />
            <span className={`text-[9px] font-semibold ${hit ? "text-ember" : "text-smoke"}`}>{d.count}</span>
            <span className="text-[8px] text-smoke whitespace-nowrap">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Delta({ value, unit, invert = false }: { value: number | null; unit: string; invert?: boolean }) {
  if (value === null || Math.abs(value) < 0.05) return <span className="text-[10px] text-smoke">stable</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-[10px] font-semibold ${good ? "text-jade" : "text-blood"}`} style={MONO}>
      {up ? "+" : ""}
      {fmt(value)} {unit}
    </span>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

type BodyDraft = Record<string, string>;
type WorkoutDraft = {
  id?: number;
  date: string;
  type: string;
  title: string;
  durationMin: string;
  intensity: number;
  calories: string;
  distanceKm: string;
  exercises: ExerciseDraft[];
  notes: string;
};

type ExerciseDraft = { name: string; sets: string; reps: string; weight: string; bw: boolean; seconds: string };

const EMPTY_EX: ExerciseDraft = { name: "", sets: "", reps: "", weight: "", bw: false, seconds: "" };

const toDraft = (e: Exercise): ExerciseDraft => ({
  name: e.name,
  sets: e.sets?.toString() ?? "",
  reps: e.reps?.toString() ?? "",
  weight: e.weight?.toString() ?? "",
  bw: Boolean(e.bw),
  seconds: e.seconds?.toString() ?? "",
});

const fromDraft = (e: ExerciseDraft): Exercise => ({
  name: e.name,
  sets: Number(e.sets) || 0,
  reps: Number(e.reps) || 0,
  weight: Number(e.weight.replace(",", ".")) || 0,
  bw: e.bw,
  seconds: Number(e.seconds) || 0,
});

/** "3×12", "3×45 s", "+10 kg", "−15 kg (assisté)" */
function setsLabel(e: Exercise): string {
  const reps = e.seconds ? formatSeconds(e.seconds) : (e.reps ?? "?");
  const load = e.bw
    ? e.weight ? ` · ${e.weight > 0 ? "+" : "−"}${fmt(Math.abs(e.weight))} kg${e.weight < 0 ? " (assisté)" : ""}` : " · PDC"
    : e.weight ? ` @ ${fmt(e.weight)} kg` : "";
  return `${e.sets ?? "?"}×${reps}${load}`;
}
const RANGES = [
  { key: 30, label: "30 j" },
  { key: 90, label: "90 j" },
  { key: 365, label: "1 an" },
  { key: 0, label: "Tout" },
];

export default function SantePage() {
  const [rows, setRows] = useState<BodyMetric[]>([]);
  const [sessions, setSessions] = useState<Workout[]>([]);
  const [cfg, setCfg] = useState<SanteConfig>(DEFAULT_SANTE);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("weightKg");
  const [range, setRange] = useState(90);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [bodyDraft, setBodyDraft] = useState<BodyDraft>({});
  const [woOpen, setWoOpen] = useState(false);
  const [wo, setWo] = useState<WorkoutDraft | null>(null);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgDraft, setCfgDraft] = useState({ weeklyGoal: "4", targetWeightKg: "", sex: "homme" as "homme" | "femme" });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const [b, w] = await Promise.all([
      apiFetch("/api/body", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/workouts", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setRows(b.rows ?? []);
    setCfg(b.config ?? DEFAULT_SANTE);
    setSessions(Array.isArray(w) ? w : []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayKey();

  /* ---------- Dernières valeurs connues (champ par champ) ---------- */
  const latest = useMemo(() => {
    const out: Record<string, { value: number; date: string; prev: number | null } | undefined> = {};
    const keys = ["weightKg", "heightCm", "bodyFatPct", ...MEASURES.map((m) => m.key)] as const;
    for (const k of keys) {
      const withVal = rows.filter((r) => r[k] !== null && r[k] !== undefined);
      if (withVal.length) {
        const last = withVal[withVal.length - 1];
        const prev = withVal.length > 1 ? (withVal[withVal.length - 2][k] as number) : null;
        out[k] = { value: last[k] as number, date: last.date, prev };
      }
    }
    return out;
  }, [rows]);

  const height = latest.heightCm?.value ?? null;
  const weight = latest.weightKg?.value ?? null;
  const currentBmi = bmi(weight, height);
  const bmiCat = currentBmi ? bmiCategory(currentBmi) : null;
  const navy = navyBodyFat(cfg.sex, height, latest.neck?.value ?? null, latest.waist?.value ?? null, latest.hips?.value ?? null);
  const bodyFat = latest.bodyFatPct?.value ?? navy;
  const bodyFatIsEstimate = latest.bodyFatPct === undefined && navy !== null;

  // Variation du poids sur 30 jours
  const weight30 = useMemo(() => {
    const ws = rows.filter((r) => r.weightKg);
    if (ws.length < 2 || !weight) return null;
    const ref = [...ws].reverse().find((r) => diffDays(today, r.date) >= 30) ?? ws[0];
    return weight - (ref.weightKg as number);
  }, [rows, weight, today]);

  /* ---------- Série du graphique ---------- */
  const series = useMemo(() => {
    const from = range ? addDays(today, -range) : "0000-00-00";
    let lastHeight: number | null = null;
    const out: { date: string; value: number }[] = [];
    for (const r of rows) {
      if (r.heightCm) lastHeight = r.heightCm;
      if (r.date < from) continue;
      let v: number | null = null;
      if (metric === "bmi") v = bmi(r.weightKg, r.heightCm ?? lastHeight);
      else v = r[metric] as number | null;
      if (v !== null && v !== undefined) out.push({ date: r.date, value: Math.round(v * 10) / 10 });
    }
    return out;
  }, [rows, metric, range, today]);

  /* ---------- Séances ---------- */
  const weekStart = weekStartOf(today);
  const thisWeek = sessions.filter((s) => s.date >= weekStart && s.date <= today);
  const thisWeekMin = thisWeek.reduce((s, w) => s + (w.durationMin ?? 0), 0);

  const weeks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const start = addDays(weekStart, -7 * (11 - i));
      const end = addDays(start, 6);
      const ss = sessions.filter((s) => s.date >= start && s.date <= end);
      const d = parseKey(start);
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        minutes: ss.reduce((s, w) => s + (w.durationMin ?? 0), 0),
        count: ss.length,
      };
    });
  }, [sessions, weekStart]);

  // Semaines consécutives où l'objectif est atteint (la semaine en cours compte si déjà atteinte)
  const streak = useMemo(() => {
    let n = 0;
    for (let i = 0; ; i++) {
      const start = addDays(weekStart, -7 * i);
      const end = addDays(start, 6);
      const count = sessions.filter((s) => s.date >= start && s.date <= end).length;
      if (count >= cfg.weeklyGoal) n++;
      else if (i === 0) continue;
      else break;
      if (i > 520) break;
    }
    return n;
  }, [sessions, weekStart, cfg.weeklyGoal]);

  const typeSplit = useMemo(() => {
    const from = addDays(today, -90);
    const map = new Map<string, number>();
    sessions.filter((s) => s.date >= from).forEach((s) => map.set(s.type, (map.get(s.type) ?? 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: typeMeta(k).label, value: v, color: typeMeta(k).color }));
  }, [sessions, today]);

  const monthStats = useMemo(() => {
    const from = addDays(today, -29);
    const ss = sessions.filter((s) => s.date >= from);
    return {
      count: ss.length,
      minutes: ss.reduce((s, w) => s + (w.durationMin ?? 0), 0),
      km: ss.reduce((s, w) => s + (w.distanceKm ?? 0), 0),
      tonnage: ss.reduce((s, w) => s + volumeOf(parseExercises(w.exercises), bodyWeightOn(rows, w.date)), 0),
      bwReps: ss.reduce((s, w) => s + bodyweightTotals(parseExercises(w.exercises)).reps, 0),
    };
  }, [sessions, rows, today]);

  const records = useMemo(() => bodyweightRecords(sessions), [sessions]);

  const filteredSessions = sessions.filter((s) => typeFilter === "all" || s.type === typeFilter);
  const visibleSessions = showAll ? filteredSessions : filteredSessions.slice(0, 8);

  /* ---------- Actions : mesures ---------- */
  function draftFor(date: string): BodyDraft {
    const r = rows.find((x) => x.date === date);
    const d: BodyDraft = { date, notes: r?.notes ?? "" };
    for (const k of ["weightKg", "heightCm", "bodyFatPct", ...MEASURES.map((m) => m.key)] as const) {
      const v = r?.[k];
      d[k] = v === null || v === undefined ? "" : String(v);
    }
    if (!r && height) d.heightCm = String(height);
    return d;
  }

  function openBody(date = today) {
    setBodyDraft(draftFor(date));
    setBodyOpen(true);
  }

  async function saveBody() {
    await apiFetch("/api/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // virgule décimale française → point
      body: JSON.stringify(
        Object.fromEntries(Object.entries(bodyDraft).map(([k, v]) => [k, k === "notes" || k === "date" ? v : v.replace(",", ".")]))
      ),
    });
    setBodyOpen(false);
    load();
  }

  async function deleteBody(id: number) {
    await apiFetch(`/api/body?id=${id}`, { method: "DELETE" });
    load();
  }

  /* ---------- Actions : séances ---------- */
  function openWorkout(w?: Workout) {
    if (w) {
      setWo({
        id: w.id,
        date: w.date,
        type: w.type,
        title: w.title ?? "",
        durationMin: w.durationMin?.toString() ?? "",
        intensity: w.intensity ?? 6,
        calories: w.calories?.toString() ?? "",
        distanceKm: w.distanceKm?.toString() ?? "",
        exercises: parseExercises(w.exercises).map(toDraft),
        notes: w.notes ?? "",
      });
    } else {
      setWo({
        date: today, type: "muscu", title: "", durationMin: "60", intensity: 6, calories: "", distanceKm: "",
        exercises: [{ ...EMPTY_EX }], notes: "",
      });
    }
    setWoOpen(true);
  }

  /** Reprend les exercices de la dernière séance du même type */
  function copyLast() {
    if (!wo) return;
    const last = sessions.find((s) => s.type === wo.type && s.id !== wo.id && s.exercises);
    if (!last) return;
    setWo({
      ...wo,
      title: wo.title || last.title || "",
      exercises: parseExercises(last.exercises).map(toDraft),
    });
  }

  /** Changing the session type: empty rows follow the new type (bodyweight or not). */
  function setWorkoutType(type: string) {
    if (!wo) return;
    const bw = Boolean(typeMeta(type).bodyweight);
    setWo({ ...wo, type, exercises: wo.exercises.map((e) => (e.name.trim() ? e : { ...e, bw })) });
  }

  async function saveWorkout() {
    if (!wo) return;
    const dot = (s: string) => s.replace(",", ".");
    const body = {
      ...wo,
      distanceKm: dot(wo.distanceKm),
      exercises: wo.exercises.map((e) => ({ ...e, weight: dot(e.weight), bw: e.bw || undefined })),
    };
    await apiFetch("/api/workouts", {
      method: wo.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setWoOpen(false);
    load();
  }

  async function deleteWorkout(id: number) {
    await apiFetch(`/api/workouts?id=${id}`, { method: "DELETE" });
    load();
  }

  async function saveCfg() {
    const res = await apiFetch("/api/body", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weeklyGoal: Number(cfgDraft.weeklyGoal),
        targetWeightKg: cfgDraft.targetWeightKg ? Number(cfgDraft.targetWeightKg.replace(",", ".")) : null,
        sex: cfgDraft.sex,
      }),
    });
    setCfg(await res.json());
    setCfgOpen(false);
  }

  const toTarget = cfg.targetWeightKg && weight ? weight - cfg.targetWeightKg : null;
  const weekPct = Math.min(100, (thisWeek.length / cfg.weeklyGoal) * 100);
  const woType = wo ? typeMeta(wo.type) : null;
  const woBodyWeight = wo ? bodyWeightOn(rows, wo.date) : null;
  const woVolume = wo ? volumeOf(wo.exercises.map(fromDraft), woBodyWeight) : 0;
  const woBw = wo ? bodyweightTotals(wo.exercises.map(fromDraft)) : { reps: 0, seconds: 0 };
  const woHasBw = Boolean(wo?.exercises.some((e) => e.bw));
  const woHasTimed = Boolean(woType?.bodyweight || wo?.exercises.some((e) => e.seconds || bodyweightInfo(e.name)?.timed));

  return (
    <ScreenFrame title="Le Temple">
      {/* ===== EN-TÊTE ===== */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Le Temple — Corps · Mesures · Entraînement</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">Le corps est l'arme première</h1>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Btn small onClick={() => { setCfgDraft({ weeklyGoal: String(cfg.weeklyGoal), targetWeightKg: cfg.targetWeightKg?.toString() ?? "", sex: cfg.sex }); setCfgOpen(true); }}>
            <Settings2 className="w-3.5 h-3.5" /> Objectifs
          </Btn>
          <Btn small variant="outline" onClick={() => openBody()}>
            <DynIcon name="ruler" className="w-3.5 h-3.5" /> Mesures
          </Btn>
          <Btn small variant="primary" onClick={() => openWorkout()}>
            <Plus className="w-3.5 h-3.5" /> Séance
          </Btn>
        </div>
      </div>

      {/* ===== KPI ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card hairline>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">
            <DynIcon name="scale" className="w-3.5 h-3.5 text-ember" /> Poids
          </div>
          <div className="flex items-baseline font-display text-3xl font-bold text-ash" style={MONO}>
            {/* Soft focus reveal, once: counting from 0 kg would mean nothing. */}
            <BlurText key={fmt(weight)} text={fmt(weight)} effect="focus" blur={6} stepDuration={0.45} />
            <span className="text-sm text-smoke ml-1">kg</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <Delta value={weight30} unit="kg / 30 j" invert={cfg.targetWeightKg ? cfg.targetWeightKg < (weight ?? 0) : false} />
            {toTarget !== null && (
              <span className="text-[10px] text-smoke">
                · cible {Math.abs(toTarget) < 0.1 ? "atteinte" : `à ${fmt(Math.abs(toTarget))} kg`}
              </span>
            )}
          </div>
        </Card>

        <Card hairline>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">
            <DynIcon name="gauge" className="w-3.5 h-3.5 text-ember" /> IMC
          </div>
          <div className="font-display text-3xl font-bold" style={{ ...MONO, color: bmiCat?.color ?? "#e5e5e5" }}>
            {fmt(currentBmi)}
          </div>
          <div className="mt-1.5 text-[10px]" style={{ color: bmiCat?.color ?? "#a0a0a0" }}>
            {bmiCat?.label ?? (height ? "Ajoute un poids" : "Ajoute ta taille")}
            {height && <span className="text-smoke"> · {fmt(height, 0)} cm</span>}
          </div>
        </Card>

        <Card hairline>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">
            <DynIcon name="percent" className="w-3.5 h-3.5 text-ember" /> Masse grasse
          </div>
          <div className="font-display text-3xl font-bold text-ash" style={MONO}>
            {fmt(bodyFat)}
            <span className="text-sm text-smoke ml-1">%</span>
          </div>
          <div className="mt-1.5 text-[10px] text-smoke">
            {bodyFatIsEstimate ? "Estimée (méthode US Navy)" : bodyFat !== null ? (
              <Delta value={latest.bodyFatPct?.prev != null ? latest.bodyFatPct.value - latest.bodyFatPct.prev : null} unit="%" invert />
            ) : "Cou + ventre requis pour l'estimer"}
          </div>
        </Card>

        <Card hairline>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">
            <DynIcon name="flame" className="w-3.5 h-3.5 text-ember" /> Cette semaine
          </div>
          <div className="font-display text-3xl font-bold text-ash" style={MONO}>
            {thisWeek.length}
            <span className="text-sm text-smoke ml-1">/ {cfg.weeklyGoal}</span>
          </div>
          <ProgressBar value={weekPct} className="mt-2" color={weekPct >= 100 ? "#10b981" : "#d4af37"} />
          <div className="mt-1.5 text-[10px] text-smoke">
            {thisWeekMin} min · série <span className="text-ember font-semibold">{streak} sem.</span>
          </div>
        </Card>
      </div>

      {/* ===== ÉVOLUTION + MENSURATIONS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <SectionTitle
            icon="trending-up"
            title={`Évolution · ${METRIC_LABELS[metric].label}`}
            sub={series.length ? `${series.length} relevé(s)` : undefined}
            right={
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-colors whitespace-nowrap ${
                      range === r.key ? "border-ember/50 text-ember bg-ember/10" : "border-line text-smoke hover:text-ash"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="flex gap-1.5 flex-wrap mb-3">
            {(["weightKg", "bmi", "bodyFatPct"] as MetricKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  metric === k ? "border-ember/50 text-flame bg-ember/10" : "border-line text-dust hover:text-ash"
                }`}
              >
                {METRIC_LABELS[k].label}
              </button>
            ))}
          </div>
          {loaded && rows.length === 0 ? (
            <EmptyState icon="scale" title="Aucune mesure enregistrée" sub="Commence par ta taille et ton poids du jour." />
          ) : (
            <ValueLine
              points={series}
              unit={METRIC_LABELS[metric].unit}
              target={metric === "weightKg" ? cfg.targetWeightKg : null}
            />
          )}
        </Card>

        <Card>
          <SectionTitle
            icon="ruler"
            title="Mensurations"
            sub="Dernier relevé · écart avec le précédent"
            right={<Btn small aria-label="Ajouter des mesures" onClick={() => openBody()}><Plus className="w-3 h-3" /></Btn>}
          />
          <div className="space-y-1">
            {MEASURES.map((m) => {
              const l = latest[m.key];
              const active = metric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => l && setMetric(m.key)}
                  // No measure yet: nothing to chart (an inactive control, WCAG 1.4.3 exception).
                  disabled={!l}
                  aria-pressed={active}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left ${
                    active ? "bg-ember/10 ring-1 ring-ember/40" : "hover:bg-raise/60"
                  } ${l ? "" : "opacity-50 cursor-default"}`}
                >
                  <span className={`text-[12px] ${active ? "text-flame" : "text-dust"}`}>{m.label}</span>
                  <span className="flex items-center gap-2.5">
                    {l && <Delta value={l.prev !== null ? l.value - l.prev : null} unit="" invert={m.key === "waist" || m.key === "hips"} />}
                    <span className="text-[13px] font-semibold text-ash w-16 text-right" style={MONO}>
                      {l ? `${fmt(l.value)}` : "—"}
                      <span className="text-[10px] text-smoke ml-0.5">cm</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ===== ENTRAÎNEMENT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <SectionTitle
            icon="bar-chart-3"
            title="Volume d'entraînement"
            sub={`12 dernières semaines · minutes / semaine · objectif ${cfg.weeklyGoal} séances`}
          />
          <WeekColumns data={weeks} goal={cfg.weeklyGoal} />
          <div className={`grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-line ${monthStats.bwReps ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
            {[
              { label: "Séances (30 j)", value: monthStats.count, unit: "" },
              { label: "Temps (30 j)", value: Math.round(monthStats.minutes / 6) / 10, unit: "h" },
              { label: "Distance (30 j)", value: monthStats.km, unit: "km" },
              { label: "Tonnage (30 j)", value: monthStats.tonnage / 1000, unit: "t" },
              ...(monthStats.bwReps ? [{ label: "Reps PDC (30 j)", value: monthStats.bwReps, unit: "" }] : []),
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-raise/40 border border-line px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.14em] text-smoke">{s.label}</div>
                <div className="text-lg font-bold text-ash" style={MONO}>
                  {fmt(s.value)}
                  <span className="text-[10px] text-smoke ml-1">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle icon="pie-chart" title="Répartition" sub="Types de séances · 90 jours" />
          {typeSplit.length ? <Bars data={typeSplit} /> : <EmptyState icon="activity" title="Aucune séance récente" />}
        </Card>
      </div>

      {/* ===== RECORDS AU POIDS DU CORPS ===== */}
      {records.length > 0 && (
        <Card className="mb-4">
          <SectionTitle icon="trophy" title="Records au poids du corps" sub="Meilleure série par exercice · répétitions ou temps tenu" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {records.map((r) => (
              <div key={`${r.name}-${r.unit}`} className="rounded-lg bg-raise/40 border border-line px-3 py-2">
                <div className="text-[10px] text-dust truncate" title={r.name}>{r.name}</div>
                <div className="text-lg font-bold" style={{ ...MONO, color: WORKOUT_TYPES.poids_corps.color }}>
                  {r.unit === "s" ? formatSeconds(r.best) : r.best}
                  {r.unit === "reps" && <span className="text-[10px] text-smoke ml-1">reps</span>}
                </div>
                <div className="text-[9.5px] text-smoke">
                  {r.lest ? `${r.lest > 0 ? "+" : "−"}${fmt(Math.abs(r.lest))} kg · ` : ""}
                  <span className="capitalize">{formatKeyFr(r.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== JOURNAL DES SÉANCES ===== */}
      <Card className="mb-4">
        <SectionTitle
          icon="dumbbell"
          title="Journal d'entraînement"
          sub={`${sessions.length} séance(s) au total`}
          right={<Btn small variant="primary" onClick={() => openWorkout()}><Plus className="w-3.5 h-3.5" /> Séance</Btn>}
        />
        <div className="flex gap-1.5 flex-wrap mb-4">
          {[["all", "Toutes"], ...Object.entries(WORKOUT_TYPES).map(([k, v]) => [k, v.label])]
            .filter(([k]) => k === "all" || sessions.some((s) => s.type === k))
            .map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTypeFilter(k)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  typeFilter === k ? "border-ember/50 text-flame bg-ember/10" : "border-line text-dust hover:text-ash"
                }`}
              >
                {label}
              </button>
            ))}
        </div>
        {filteredSessions.length === 0 ? (
          <EmptyState icon="dumbbell" title="Aucune séance enregistrée" sub="Ajoute ta première séance pour démarrer le suivi." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {visibleSessions.map((s) => {
              const t = typeMeta(s.type);
              const ex = parseExercises(s.exercises);
              const vol = volumeOf(ex, bodyWeightOn(rows, s.date));
              const bw = bodyweightTotals(ex);
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border border-line bg-[#131313] p-3.5 hover:border-line2 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{ background: `${t.color}14`, borderColor: `${t.color}40` }}
                    >
                      <DynIcon name={t.icon} className="w-4 h-4" style={{ color: t.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-ash truncate">{s.title || t.label}</p>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openWorkout(s)} className="p-1 rounded text-smoke hover:text-ash" aria-label="Modifier">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteWorkout(s.id)} className="p-1 rounded text-smoke hover:text-blood" aria-label="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-smoke">
                        <span className="capitalize">{formatKeyFr(s.date)}</span>
                        {s.title ? ` · ${t.label}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-dust" style={MONO}>
                        {s.durationMin ? <span>⏱ {s.durationMin} min</span> : null}
                        {s.distanceKm ? <span>{fmt(s.distanceKm, 2)} km</span> : null}
                        {s.distanceKm && s.durationMin ? (
                          <span className="text-smoke">
                            {(() => {
                              const pace = s.durationMin / s.distanceKm;
                              return `${Math.floor(pace)}′${String(Math.round((pace % 1) * 60)).padStart(2, "0")}/km`;
                            })()}
                          </span>
                        ) : null}
                        {s.calories ? <span>{s.calories} kcal</span> : null}
                        {s.intensity ? (
                          <span style={{ color: s.intensity >= 8 ? "#f87171" : s.intensity >= 6 ? "#d4af37" : "#10b981" }}>
                            RPE {s.intensity}/10
                          </span>
                        ) : null}
                        {bw.reps > 0 && <span style={{ color: WORKOUT_TYPES.poids_corps.color }}>{bw.reps} reps PDC</span>}
                        {bw.seconds > 0 && <span style={{ color: WORKOUT_TYPES.poids_corps.color }}>{formatSeconds(bw.seconds)} tenues</span>}
                        {vol > 0 && <span className="text-ember">{ex.some((e) => e.bw) ? "≈ " : ""}{fmt(vol, 0)} kg {ex.some((e) => e.bw) ? "déplacés" : "soulevés"}</span>}
                      </div>
                      {ex.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {ex.slice(0, 5).map((e, i) => (
                            <li key={i} className="text-[11px] text-dust flex justify-between gap-2">
                              <span className="truncate">{e.name}</span>
                              <span className="text-smoke shrink-0" style={MONO}>{setsLabel(e)}</span>
                            </li>
                          ))}
                          {ex.length > 5 && <li className="text-[10px] text-smoke">+ {ex.length - 5} exercice(s)</li>}
                        </ul>
                      )}
                      {s.notes && <p className="text-[11px] text-smoke italic mt-2 line-clamp-2">{s.notes}</p>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {filteredSessions.length > 8 && (
          <div className="text-center mt-3">
            <Btn small onClick={() => setShowAll(!showAll)}>
              {showAll ? "Réduire" : `Voir les ${filteredSessions.length - 8} autres`}
            </Btn>
          </div>
        )}
      </Card>

      {/* ===== HISTORIQUE DES MESURES ===== */}
      <Card>
        <SectionTitle icon="table" title="Historique des mesures" sub="Clique sur une ligne pour la modifier" />
        {rows.length === 0 ? (
          <EmptyState icon="ruler" title="Aucun relevé" />
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px] min-w-[760px]">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.12em] text-smoke text-left">
                  <th className="px-2 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold text-right">Poids</th>
                  <th className="px-2 py-2 font-semibold text-right">Taille</th>
                  <th className="px-2 py-2 font-semibold text-right">MG %</th>
                  {MEASURES.map((m) => (
                    <th key={m.key} className="px-2 py-2 font-semibold text-right">{m.label.split(" ")[0]}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openBody(r.date)}
                    tabIndex={0}
                    aria-label={`Modifier le relevé du ${formatKeyFr(r.date)}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openBody(r.date);
                      }
                    }}
                    className="border-t border-line hover:bg-raise/40 cursor-pointer group"
                    style={MONO}
                  >
                    <td className="px-2 py-2 text-dust whitespace-nowrap" style={{ fontFamily: "inherit" }}>{formatKeyFr(r.date)}</td>
                    <td className="px-2 py-2 text-right text-ash font-semibold">{fmt(r.weightKg)}</td>
                    <td className="px-2 py-2 text-right text-dust">{fmt(r.heightCm, 0)}</td>
                    <td className="px-2 py-2 text-right text-dust">{fmt(r.bodyFatPct)}</td>
                    {MEASURES.map((m) => (
                      <td key={m.key} className="px-2 py-2 text-right text-dust">{fmt(r[m.key])}</td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBody(r.id); }}
                        className="p-1 rounded text-smoke [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 hover:text-blood transition-opacity"
                        aria-label={`Supprimer la mesure du ${r.date}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ===== MODALE : MESURES ===== */}
      <Modal open={bodyOpen} onClose={() => setBodyOpen(false)} title="Pesée & mensurations" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Date">
              <Input
                type="date"
                value={bodyDraft.date ?? today}
                max={today}
                onChange={(e) => setBodyDraft(draftFor(e.target.value || today))}
              />
            </Field>
            <Field label="Poids (kg)">
              <Input inputMode="decimal" placeholder="75,4" value={bodyDraft.weightKg ?? ""} onChange={(e) => setBodyDraft({ ...bodyDraft, weightKg: e.target.value })} />
            </Field>
            <Field label="Taille (cm)">
              <Input inputMode="decimal" placeholder="180" value={bodyDraft.heightCm ?? ""} onChange={(e) => setBodyDraft({ ...bodyDraft, heightCm: e.target.value })} />
            </Field>
            <Field label="Masse grasse (%)">
              <Input inputMode="decimal" placeholder="facultatif" value={bodyDraft.bodyFatPct ?? ""} onChange={(e) => setBodyDraft({ ...bodyDraft, bodyFatPct: e.target.value })} />
            </Field>
          </div>
          {rows.some((r) => r.date === bodyDraft.date) && (
            <p className="text-[10px] text-ember">Un relevé existe déjà à cette date : il sera remplacé.</p>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Mensurations (cm)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MEASURES.map((m) => (
                <Field key={m.key} label={m.label}>
                  <Input
                    inputMode="decimal"
                    placeholder={latest[m.key] ? fmt(latest[m.key]!.value) : "—"}
                    value={bodyDraft[m.key] ?? ""}
                    onChange={(e) => setBodyDraft({ ...bodyDraft, [m.key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          </div>
          <Field label="Notes">
            <Textarea value={bodyDraft.notes ?? ""} onChange={(e) => setBodyDraft({ ...bodyDraft, notes: e.target.value })} placeholder="À jeun, après le réveil…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setBodyOpen(false)}>Annuler</Btn>
            <Btn variant="primary" onClick={saveBody}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>

      {/* ===== MODALE : SÉANCE ===== */}
      <Modal open={woOpen} onClose={() => setWoOpen(false)} title={wo?.id ? "Modifier la séance" : "Nouvelle séance"} wide>
        {wo && woType && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {Object.entries(WORKOUT_TYPES).map(([k, t]) => (
                <button
                  key={k}
                  onClick={() => setWorkoutType(k)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors ${
                    wo.type === k ? "bg-raise" : "border-line hover:border-line2"
                  }`}
                  style={wo.type === k ? { borderColor: `${t.color}80` } : undefined}
                >
                  <DynIcon name={t.icon} className="w-4 h-4" style={{ color: wo.type === k ? t.color : "#a0a0a0" }} />
                  <span className={`text-[9.5px] text-center leading-tight ${wo.type === k ? "text-ash" : "text-smoke"}`}>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Date">
                <Input type="date" value={wo.date} max={today} onChange={(e) => setWo({ ...wo, date: e.target.value || today })} />
              </Field>
              <Field label="Intitulé">
                <Input placeholder={woType.exercises ? "Push, Jambes…" : "Sortie longue…"} value={wo.title} onChange={(e) => setWo({ ...wo, title: e.target.value })} />
              </Field>
              <Field label="Durée (min)">
                <Input inputMode="numeric" value={wo.durationMin} onChange={(e) => setWo({ ...wo, durationMin: e.target.value })} />
              </Field>
              {woType.cardio && (
                <Field label="Distance (km)">
                  <Input inputMode="decimal" value={wo.distanceKm} onChange={(e) => setWo({ ...wo, distanceKm: e.target.value })} />
                </Field>
              )}
              <Field label="Calories (kcal)">
                <Input inputMode="numeric" placeholder="facultatif" value={wo.calories} onChange={(e) => setWo({ ...wo, calories: e.target.value })} />
              </Field>
            </div>
            <Slider label="Intensité ressentie (RPE)" value={wo.intensity} onChange={(v) => setWo({ ...wo, intensity: v })} />

            {(woType.exercises || wo.exercises.some((e) => e.name)) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-smoke">Exercices</span>
                  <div className="flex items-center gap-2">
                    {woBw.reps > 0 && <span className="text-[10px]" style={{ ...MONO, color: WORKOUT_TYPES.poids_corps.color }}>{woBw.reps} reps</span>}
                    {woBw.seconds > 0 && <span className="text-[10px]" style={{ ...MONO, color: WORKOUT_TYPES.poids_corps.color }}>{formatSeconds(woBw.seconds)}</span>}
                    {woVolume > 0 && <span className="text-[10px] text-ember" style={MONO}>{woHasBw ? "≈ " : ""}{fmt(woVolume, 0)} kg</span>}
                    {sessions.some((s) => s.type === wo.type && s.id !== wo.id && s.exercises) && (
                      <Btn small onClick={copyLast}>Reprendre la dernière</Btn>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className={`grid ${woHasTimed ? "grid-cols-[1fr_44px_46px_50px_54px_40px_24px]" : "grid-cols-[1fr_44px_46px_54px_40px_24px]"} gap-1.5 text-[9px] uppercase tracking-[0.12em] text-smoke px-0.5`}>
                    <span>Nom</span><span>Séries</span><span>Reps</span>{woHasTimed && <span>Sec.</span>}
                    <span>{woHasBw ? "Kg / lest" : "Kg"}</span><span title="Poids du corps">PDC</span><span />
                  </div>
                  <datalist id="bodyweight-exercises">
                    {BODYWEIGHT_EXERCISES.map((x) => <option key={x.name} value={x.name} />)}
                  </datalist>
                  {wo.exercises.map((e, i) => {
                    const set = (patch: Partial<typeof e>) =>
                      setWo({ ...wo, exercises: wo.exercises.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                    const known = bodyweightInfo(e.name);
                    return (
                      <div key={i} className={`grid ${woHasTimed ? "grid-cols-[1fr_44px_46px_50px_54px_40px_24px]" : "grid-cols-[1fr_44px_46px_54px_40px_24px]"} gap-1.5`}>
                        <Input
                          placeholder={e.bw ? "Tractions" : "Développé couché"}
                          list={e.bw || woType.bodyweight ? "bodyweight-exercises" : undefined}
                          value={e.name}
                          // a known bodyweight exercise switches the row to PDC by itself
                          onChange={(ev) => set({ name: ev.target.value, ...(bodyweightInfo(ev.target.value) ? { bw: true } : {}) })}
                          className="!px-2"
                        />
                        <Input inputMode="numeric" aria-label={`Séries – ${e.name || `exercice ${i + 1}`}`} value={e.sets} onChange={(ev) => set({ sets: ev.target.value })} className="!px-2 text-center" />
                        <Input inputMode="numeric" aria-label={`Répétitions – ${e.name || `exercice ${i + 1}`}`} placeholder={known?.timed ? "—" : ""} value={e.reps} onChange={(ev) => set({ reps: ev.target.value })} className="!px-2 text-center" />
                        {woHasTimed && (
                          <Input inputMode="numeric" placeholder={known?.timed ? "45" : ""} value={e.seconds} onChange={(ev) => set({ seconds: ev.target.value })} className="!px-2 text-center" aria-label="Durée par série (secondes)" />
                        )}
                        <Input
                          inputMode="decimal"
                          placeholder={e.bw ? "+0" : ""}
                          title={e.bw ? "Lest ajouté en kg (négatif = assistance, élastique)" : "Charge en kg"}
                          value={e.weight}
                          onChange={(ev) => set({ weight: ev.target.value })}
                          className="!px-2 text-center"
                        />
                        <button
                          type="button"
                          onClick={() => set({ bw: !e.bw })}
                          className={`rounded-lg border text-[9px] font-semibold transition-colors ${e.bw ? "text-ash" : "border-line text-smoke hover:text-ash"}`}
                          style={e.bw ? { borderColor: `${WORKOUT_TYPES.poids_corps.color}90`, background: `${WORKOUT_TYPES.poids_corps.color}20` } : undefined}
                          aria-pressed={e.bw}
                          title="Exercice au poids du corps"
                        >
                          PDC
                        </button>
                        <button
                          onClick={() => setWo({ ...wo, exercises: wo.exercises.filter((_, j) => j !== i) })}
                          className="flex items-center justify-center rounded-lg text-smoke hover:text-blood"
                          aria-label="Retirer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Btn small onClick={() => setWo({ ...wo, exercises: [...wo.exercises, { ...EMPTY_EX, bw: Boolean(woType.bodyweight) }] })}>
                      <Plus className="w-3 h-3" /> Exercice
                    </Btn>
                    {woHasBw && (
                      <span className="text-[10px] text-smoke">
                        {woBodyWeight
                          ? `PDC : charge estimée à partir de ton poids (${fmt(woBodyWeight)} kg) + lest.`
                          : "PDC : renseigne ton poids dans les mesures pour estimer les kilos déplacés."}
                        {woHasTimed ? " Exercices tenus : durée d'une série en secondes." : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Field label="Notes">
              <Textarea value={wo.notes} onChange={(e) => setWo({ ...wo, notes: e.target.value })} placeholder="Sensations, douleurs, records…" />
            </Field>
            <div className="flex justify-between gap-2">
              {wo.id ? (
                <Btn variant="danger" onClick={() => { deleteWorkout(wo.id!); setWoOpen(false); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </Btn>
              ) : <span />}
              <div className="flex gap-2">
                <Btn onClick={() => setWoOpen(false)}>Annuler</Btn>
                <Btn variant="primary" onClick={saveWorkout}>Enregistrer</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== MODALE : OBJECTIFS ===== */}
      <Modal open={cfgOpen} onClose={() => setCfgOpen(false)} title="Objectifs du Temple">
        <div className="space-y-4">
          <Field label="Séances par semaine">
            <Input inputMode="numeric" value={cfgDraft.weeklyGoal} onChange={(e) => setCfgDraft({ ...cfgDraft, weeklyGoal: e.target.value })} />
          </Field>
          <Field label="Poids cible (kg)">
            <Input inputMode="decimal" placeholder="facultatif" value={cfgDraft.targetWeightKg} onChange={(e) => setCfgDraft({ ...cfgDraft, targetWeightKg: e.target.value })} />
          </Field>
          <Field label="Sexe (pour l'estimation de masse grasse)">
            <Select value={cfgDraft.sex} onChange={(e) => setCfgDraft({ ...cfgDraft, sex: e.target.value as "homme" | "femme" })}>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </Select>
          </Field>
          <p className="text-[10px] text-smoke">Ton dernier poids et ton sexe sont aussi utilisés par L'Intendance pour l'estimation d'alcoolémie.</p>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setCfgOpen(false)}>Annuler</Btn>
            <Btn variant="primary" onClick={saveCfg}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>
    </ScreenFrame>
  );
}
