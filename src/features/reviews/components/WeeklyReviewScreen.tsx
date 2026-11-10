"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { Check, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Field, Input, Select, Textarea, Slider } from "@/shared/ui/primitives";
import { RadarChart, Bars } from "@/shared/ui/charts";
import { INTERDITS, PIEGES, PILLARS } from "@/shared/domain/constants";
import { addDays, formatKeyFr, todayKey, weekStartOf, weekdayName } from "@/shared/lib/dates";
import { scoreColor, scoreTextColor } from "@/shared/ui/score-color";
import { parseJson, type JournalRow, type PlayerData } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

type Review = {
  weekStart: string;
  mondayPlanned: boolean | null;
  fridayDone: boolean | null;
  fridayCreated: string | null;
  saturdayCircle: boolean | null;
  sundayReview: boolean | null;
  biggestWin: string | null;
  biggestFail: string | null;
  learned: string | null;
  violatedRules: string | null;
  trapsHit: string | null;
  nextWeekGoal: string | null;
  focusPillar: string | null;
  overallMood: number | null;
  notes: string | null;
};

const MOODS = ["", "😤", "😔", "😕", "😐", "🙂", "😌", "😄", "🔥", "⚡", "👑"];

export default function WeeklyPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayKey()));
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [playerPrev, setPlayerPrev] = useState<PlayerData | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [saved, setSaved] = useState(false);

  const weekEnd = addDays(weekStart, 6);
  const load = useCallback(async () => {
    const [p, pp, r, j] = await Promise.all([
      apiFetch(`/api/player?from=${weekStart}&to=${weekEnd}`, { cache: "no-store" }).then((x) => x.json()),
      apiFetch(`/api/player?from=${addDays(weekStart, -7)}&to=${addDays(weekStart, -1)}`, { cache: "no-store" }).then((x) => x.json()),
      apiFetch(`/api/reviews?type=weekly&key=${weekStart}`, { cache: "no-store" }).then((x) => x.json()),
      apiFetch("/api/logbook", { cache: "no-store" }).then((x) => x.json()),
    ]);
    setPlayer(p);
    setPlayerPrev(pp);
    setReview(r ?? { weekStart });
    setJournals(j);
  }, [weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  const moodByDate = useMemo(() => new Map(journals.map((j) => [j.date, j.mood])), [journals]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const r = player?.range;

  async function save(patch: Record<string, unknown>) {
    const merged = { ...(review ?? { weekStart }), ...patch } as Review;
    await apiFetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "weekly", ...merged, weekStart }),
    });
    setReview(merged);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const pillars = player?.pillars ?? {};
  const weakest = PILLARS.reduce((a, p) => ((pillars[p.key] ?? 0) < (pillars[a.key] ?? 0) ? p : a), PILLARS[0]);
  const strongest = PILLARS.reduce((a, p) => ((pillars[p.key] ?? 0) > (pillars[a.key] ?? 0) ? p : a), PILLARS[0]);
  const execDays = player?.range.days.filter((d) => {
    const dow = new Date(d.date + "T12:00:00").getDay();
    return dow >= 2 && dow <= 4;
  }) ?? [];
  const execAvg = execDays.length ? Math.round(execDays.reduce((s, d) => s + d.score, 0) / execDays.length) : null;

  function Delta({ a, b, unit = "" }: { a: number; b: number | null; unit?: string }) {
    if (b === null) return <span className="text-smoke text-[10px]">—</span>;
    const d = a - b;
    if (Math.abs(d) < 0.5) return <span className="text-smoke text-[10px] flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0{unit}</span>;
    return (
      <span className={`text-[10px] flex items-center gap-0.5 ${d > 0 ? "text-jade" : "text-blood"}`}>
        {d > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        {Math.abs(Math.round(d * 10) / 10)}{unit}
      </span>
    );
  }

  return (
    <ScreenFrame title="Rapport de Guerre">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Rapport de Guerre — Semaine</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">{formatKeyFr(weekStart)} → {formatKeyFr(weekEnd)}</h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semaine précédente" className="p-2 rounded-lg text-smoke hover:text-ash border border-line"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setWeekStart(weekStartOf(todayKey()))} className="text-[11px] px-3 rounded-lg text-dust hover:text-ash border border-line">Cette semaine</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semaine suivante" className="p-2 rounded-lg text-smoke hover:text-ash border border-line"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ========== GRILLE 7 JOURS ========== */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card hairline className="mb-4">
          <SectionTitle icon="calendar-range" title="Grille de la semaine" sub="Score des habitudes par jour + humeur (cliquer : -1)" />
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((d) => {
              const dayScore = player?.range.days.find((x) => x.date === d);
              const has = Boolean(dayScore);
              const score = dayScore?.score ?? 0;
              const mood = moodByDate.get(d) ?? 0;
              const future = d > todayKey();
              return (
                <div
                  key={d}
                  className={`rounded-xl border border-line px-0.5 py-2 sm:p-2.5 text-center min-w-0 transition-all ${future ? "opacity-40" : ""}`}
                  style={{ background: has ? `${scoreColor(score)}22` : "#141414", borderColor: has ? `${scoreColor(score)}44` : undefined }}
                >
                  <p className="text-[9px] uppercase tracking-wider text-smoke">{weekdayName(d)}</p>
                  <p className="text-[10px] text-smoke">{d.slice(8)}</p>
                  <p className="font-display text-xl font-bold mt-1" style={{ color: has ? scoreTextColor(score) : "#a0a0a0" }}>{has ? `${Math.round(score)}` : "—"}</p>
                  <p className="text-[9px] text-smoke">{has ? `${dayScore!.habitsCompleted}/${dayScore!.habitsTotal}` : ""}</p>
                  <button
                    onClick={async () => {
                      const cur = moodByDate.get(d) ?? 0;
                      const next = cur >= 9 ? 0 : cur + 1;
                      const res = await apiFetch(`/api/logbook?date=${d}`, { cache: "no-store" });
                      const j = await res.json();
                      await apiFetch("/api/logbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(j ?? {}), date: d, mood: next }) });
                      load();
                    }}
                    className="mt-1 mx-auto flex items-center justify-center w-7 h-7 text-base leading-none hover:scale-125 transition-transform"
                    title="Cycle d'humeur"
                    aria-label={`Humeur du ${d}`}
                  >
                    {mood > 0 ? MOODS[mood] : <span className="text-smoke text-xs">·</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* ========== CONFORMITÉ AU CYCLE ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="h-full">
            <SectionTitle icon="refresh-ccw" title="Conformité au cycle hebdomadaire" />
            <div className="space-y-2.5">
              {[
                { day: "Lundi", label: "Planification stratégique", ctrl: <button onClick={() => save({ mondayPlanned: !review?.mondayPlanned })} aria-pressed={Boolean(review?.mondayPlanned)} aria-label="Lundi : planification stratégique faite" className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${review?.mondayPlanned ? "bg-ember border-ember text-black" : "border-line2 text-transparent hover:border-ember/60"}`}><Check className="w-3.5 h-3.5" strokeWidth={3} /></button> },
                { day: "Mar — Jeu", label: `Exécution intensive`, ctrl: <span className={`font-display text-sm font-bold ${execAvg !== null && execAvg >= 70 ? "text-jade" : execAvg !== null ? "text-ember" : "text-smoke"}`}>{execAvg !== null ? `${execAvg}%` : "—"}</span> },
                { day: "Vendredi", label: "Création & Innovation", ctrl: <button onClick={() => save({ fridayDone: !review?.fridayDone })} aria-pressed={Boolean(review?.fridayDone)} aria-label="Vendredi : création et innovation faites" className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${review?.fridayDone ? "bg-ember border-ember text-black" : "border-line2 text-transparent hover:border-ember/60"}`}><Check className="w-3.5 h-3.5" strokeWidth={3} /></button> },
                { day: "Samedi", label: "Relations & Régénération", ctrl: <button onClick={() => save({ saturdayCircle: !review?.saturdayCircle })} aria-pressed={Boolean(review?.saturdayCircle)} aria-label="Samedi : relations et régénération faites" className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${review?.saturdayCircle ? "bg-ember border-ember text-black" : "border-line2 text-transparent hover:border-ember/60"}`}><Check className="w-3.5 h-3.5" strokeWidth={3} /></button> },
                { day: "Dimanche", label: "Réflexion & Préparation", ctrl: <button onClick={() => save({ sundayReview: !review?.sundayReview })} aria-pressed={Boolean(review?.sundayReview)} aria-label="Dimanche : réflexion et préparation faites" className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${review?.sundayReview ? "bg-ember border-ember text-black" : "border-line2 text-transparent hover:border-ember/60"}`}><Check className="w-3.5 h-3.5" strokeWidth={3} /></button> },
              ].map((row) => (
                <div key={row.day} className="flex items-center justify-between bg-raise/40 border border-line rounded-lg px-3 py-2.5">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-ember">{row.day}</span>
                    <p className="text-[12px] text-ash">{row.label}</p>
                  </div>
                  {row.ctrl}
                </div>
              ))}
              <Field label="Note vendredi — projet phare avancé">
                <Input defaultValue={review?.fridayCreated ?? ""} placeholder="Qu'as-tu créé cette semaine ?" onBlur={(e) => save({ fridayCreated: e.target.value })} />
              </Field>
            </div>
          </Card>
        </motion.div>

        {/* ========== STATS HEBDO ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card className="h-full">
            <SectionTitle icon="bar-chart-3" title="Statistiques de la semaine" sub="Comparaison vs semaine précédente" />
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Deep Work", v: `${Math.round(((r?.deepWorkMin ?? 0) + (r?.practiceMin ?? 0)) / 60 * 10) / 10} h`, cmp: <Delta a={(r?.deepWorkMin ?? 0) + (r?.practiceMin ?? 0)} b={playerPrev ? (playerPrev.range.deepWorkMin + playerPrev.range.practiceMin) : null} unit=" min" /> },
                { label: "Entraînement", v: `${Math.round((r?.trainingMin ?? 0) / 60 * 10) / 10} h`, cmp: <Delta a={r?.trainingMin ?? 0} b={playerPrev?.range.trainingMin ?? null} unit=" min" /> },
                { label: "Lecture", v: `${Math.round((r?.readingMin ?? 0) / 60 * 10) / 10} h — ${r?.pagesRead ?? 0} p.`, cmp: <Delta a={r?.pagesRead ?? 0} b={playerPrev?.range.pagesRead ?? null} unit=" p." /> },
                { label: "Méditations", v: `${r?.medSessions ?? 0}`, cmp: <Delta a={r?.medSessions ?? 0} b={playerPrev?.range.medSessions ?? null} /> },
                { label: "Journaux complétés", v: `${r?.journalDays ?? 0}/7`, cmp: <Delta a={r?.journalDays ?? 0} b={playerPrev?.range.journalDays ?? null} /> },
                { label: "Score moyen", v: `${r?.avgScore ?? 0}%`, cmp: <Delta a={r?.avgScore ?? 0} b={playerPrev?.range.avgScore ?? null} unit="%" /> },
              ].map((s) => (
                <div key={s.label} className="bg-raise/40 border border-line rounded-lg p-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-smoke">{s.label}</p>
                  <p className="font-display text-lg font-bold text-ash mt-1">{s.v}</p>
                  {s.cmp}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* ========== PILIERS ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <Card className="h-full">
            <SectionTitle icon="hexagon" title="Bilan des 6 piliers" sub="Semaine courante vs précédente (pointillés)" />
            {player && (
              <div className="flex flex-col items-center">
                <RadarChart values={player.pillars} compare={player.pillarsPrev} size={235} />
                <div className="w-full">
                  <Bars data={PILLARS.map((p) => ({ label: p.short, value: player.pillars[p.key] ?? 0, color: p.color }))} max={100} />
                </div>
                <div className="w-full mt-3 p-3 rounded-lg border border-ember/25 bg-ember/5 flex gap-2.5 items-start">
                  <span className="text-ember text-sm mt-0.5">◆</span>
                  <p className="text-[11px] text-dust leading-relaxed">
                    Pilier le plus fort : <span className="text-jade font-semibold">{strongest.name}</span>.
                    {" "}Recommandation — le pilier le plus faible est <span className="text-blood font-semibold">{weakest.name}</span>. Concentre-toi sur <span className="text-ash">{weakest.description.toLowerCase()}</span>
                  </p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ========== REVUE HEBDO ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <Card className="h-full" hairline>
            <SectionTitle icon="notebook-pen" title="Revue hebdomadaire" sub="À rédiger le dimanche soir" right={saved ? <span className="text-jade text-[10px] flex items-center gap-1"><Save className="w-3 h-3" /> Sauvegardé</span> : undefined} />
            <div className="space-y-3">
              <Field label="Ma plus grande victoire cette semaine"><Textarea rows={2} defaultValue={review?.biggestWin ?? ""} onBlur={(e) => save({ biggestWin: e.target.value })} /></Field>
              <Field label="Mon plus grand échec"><Textarea rows={2} defaultValue={review?.biggestFail ?? ""} onBlur={(e) => save({ biggestFail: e.target.value })} /></Field>
              <Field label="Ce que j'ai appris de nouveau"><Textarea rows={2} defaultValue={review?.learned ?? ""} onBlur={(e) => save({ learned: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Interdits violés</p>
                  <div className="space-y-1">
                    {INTERDITS.map((it) => {
                      const cur = parseJson<string[]>(review?.violatedRules, []);
                      return (
                        <button key={it} onClick={() => save({ violatedRules: cur.includes(it) ? cur.filter((x) => x !== it) : [...cur, it] })} className={`w-full text-left text-[10.5px] px-2 py-1 rounded border transition-all ${cur.includes(it) ? "border-blood/50 text-blood bg-blood/5" : "border-line text-smoke hover:text-dust"}`}>
                          {it}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Pièges frôlés</p>
                  <div className="space-y-1">
                    {PIEGES.map((p) => {
                      const cur = parseJson<string[]>(review?.trapsHit, []);
                      return (
                        <button key={p} onClick={() => save({ trapsHit: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] })} className={`w-full text-left text-[10.5px] px-2 py-1 rounded border transition-all ${cur.includes(p) ? "border-ember/50 text-ember bg-ember/5" : "border-line text-smoke hover:text-dust"}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <Field label="Objectif principal de la semaine prochaine"><Input defaultValue={review?.nextWeekGoal ?? ""} onBlur={(e) => save({ nextWeekGoal: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pilier de concentration">
                  <Select value={review?.focusPillar ?? ""} onChange={(e) => save({ focusPillar: e.target.value })}>
                    <option value="">—</option>
                    {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </Select>
                </Field>
                <Slider label="Humeur globale" value={review?.overallMood ?? 5} onChange={(v) => save({ overallMood: v })} />
              </div>
              <Field label="Notes libres"><Textarea rows={2} defaultValue={review?.notes ?? ""} onBlur={(e) => save({ notes: e.target.value })} /></Field>
            </div>
          </Card>
        </motion.div>
      </div>
    </ScreenFrame>
  );
}
