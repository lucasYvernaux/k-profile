"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, RotateCcw, SkipForward, RefreshCw } from "lucide-react";
import { Check, ChevronRight, MapPin, Pause, Play, Clock as Timer, Cross as X } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, ProgressBar, EmptyState } from "@/shared/ui/primitives";
import { PowerGauge, RadarChart, Bars } from "@/shared/ui/charts";
import { DynIcon } from "@/shared/ui/icon";
import Link from "next/link";
import { PHASES, PILLARS, QUOTES, SUNDAY_PHASES, TIMER_CATEGORIES } from "@/shared/domain/constants";
import { appliesOn, formatKeyFr, minutesOf, nowHM, todayKey, parseKey, weekdayOf } from "@/shared/lib/dates";
import type { PhaseEntry, PlayerData, TimerRow } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

/* ============================ helpers phase ============================ */

type RoutinePhase = { key: string; start: string; end: string; title: string; icon: string };

type PhaseState = {
  current: RoutinePhase | null;
  next: RoutinePhase | null;
  idx: number;
  endDate: Date;
  startDate: Date;
};

function computePhase(now: Date, list: RoutinePhase[]): PhaseState {
  const phases = list.length > 0 ? list : PHASES;
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const m = minutesOf(hm);
  const idx = phases.findIndex((p) => m >= minutesOf(p.start) && m < minutesOf(p.end));
  if (idx >= 0) {
    const p = phases[idx];
    const start = parseKey(todayKey());
    start.setHours(Math.floor(minutesOf(p.start) / 60), minutesOf(p.start) % 60, 0, 0);
    const end = new Date(start.getTime() + (minutesOf(p.end) - minutesOf(p.start)) * 60000);
    return { current: p, next: phases[idx + 1] ?? phases[0], idx, startDate: start, endDate: end };
  }
  // Hors routine (nuit) : compte à rebours jusqu'à la première phase
  const wakeMin = minutesOf(phases[0].start);
  const lastEnd = phases.reduce((mx, p) => Math.max(mx, minutesOf(p.end)), 0);
  const start = parseKey(todayKey());
  start.setHours(Math.floor(lastEnd / 60), lastEnd % 60, 0, 0);
  if (m < wakeMin) start.setDate(start.getDate() - 1);
  const end = parseKey(todayKey());
  end.setHours(Math.floor(wakeMin / 60), wakeMin % 60, 0, 0);
  if (m >= wakeMin) end.setDate(end.getDate() + 1);
  return { current: null, next: phases[0], idx: -1, startDate: start, endDate: end };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ============================ pomodoro ============================ */

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o.start();
    o.stop(ctx.currentTime + 1.3);
  } catch { /* noop */ }
}

function Pomodoro({ open, onClose, phaseTitle }: { open: boolean; onClose: () => void; phaseTitle: string }) {
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setRunning(false);
            beep();
            try { if ("Notification" in window && Notification.permission === "granted") new Notification("Pomodoro terminé", { body: phaseTitle }); } catch { /* noop */ }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, phaseTitle]);

  function setDuration(m: number) {
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
  }

  const total = minutes * 60;
  const pct = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  return (
    <Modal open={open} onClose={onClose} title="Timer Pomodoro">
      <div className="flex flex-col items-center py-2">
        <p className="text-[11px] text-smoke mb-4 text-center">{phaseTitle}</p>
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#262626" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke="#d4af37" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 276.4} 276.4`}
              style={{ filter: "drop-shadow(0 0 6px rgba(212,175,55,0.5))", transition: "stroke-dasharray 0.5s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-ash" style={{ fontFamily: "var(--font-mono-family)" }}>
              {pad(Math.floor(secondsLeft / 60))}:{pad(secondsLeft % 60)}
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-smoke mt-1">{running ? "En cours" : "Prêt"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-5">
          {[15, 25, 45, 60, 90].map((m) => (
            <button
              key={m}
              onClick={() => setDuration(m)}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${minutes === m ? "border-ember/60 text-ember bg-ember/10" : "border-line2 text-smoke hover:text-dust"}`}
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <Btn variant="primary" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Pause" : "Démarrer"}
          </Btn>
          <Btn onClick={() => setDuration(minutes)}>
            <RotateCcw className="w-4 h-4" /> Reset
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ page ============================ */

/**
 * Daily routine (merged from the NYX-KAIROS dashboard, ADR 0010): current
 * phase with countdown and Pomodoro, quote of the day, upkeep tasks due, pillar
 * radar from K habits, and the optional gamification (score, streaks, badges).
 * Habits themselves live on the K "Aujourd'hui" page.
 */
export default function RoutineScreen() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [phaseEntries, setPhaseEntries] = useState<PhaseEntry[]>([]);
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [routine, setRoutine] = useState<RoutinePhase[]>([]);
  const [pool, setPool] = useState<
    { text: string; author: string; source?: string | null; character?: string | null; isVerbatim?: boolean }[]
  >(QUOTES);
  const [now, setNow] = useState(new Date());
  const [pomoOpen, setPomoOpen] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % QUOTES.length;
  });

  const load = useCallback(async () => {
    await apiFetch("/api/bootstrap", { method: "POST" });
    const [p, ph, t, pd] = await Promise.all([
      apiFetch("/api/player", { cache: "no-store" }).then((r) => r.json()),
      apiFetch(`/api/phases?date=${todayKey()}`, { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/timers", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/phase-defs", { cache: "no-store" }).then((r) => r.json()),
    ]);
    try {
      const qs = (await apiFetch("/api/quotes", { cache: "no-store" }).then((r) => r.json())) as {
        text: string; author: string; source: string | null; character: string | null; isVerbatim: boolean; isActive: boolean;
      }[];
      const active = qs.filter((x) => x.isActive);
      if (active.length > 0) setPool(active);
    } catch { /* repli sur les constantes */ }
    setPlayer(p);
    setPhaseEntries(ph);
    setTimers(t.timers);
    setRoutine(
      (pd as { key: string; title: string; startTime: string; endTime: string; icon: string; isActive: boolean; daysOfWeek: string | null }[])
        .filter((x) => x.isActive && appliesOn(x.daysOfWeek, todayKey()))
        .map((x) => ({ key: x.key, title: x.title, start: x.startTime, end: x.endTime, icon: x.icon }))
        .sort((a, b) => a.start.localeCompare(b.start))
    );
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(load, 60000);
    return () => { clearInterval(t); clearInterval(refresh); };
  }, [load]);

  const isSunday = weekdayOf(todayKey()) === 0;
  const fallback = isSunday ? SUNDAY_PHASES : PHASES;
  const activeRoutine: RoutinePhase[] =
    routine.length > 0 ? routine : fallback.map((p) => ({ key: p.key, title: p.title, start: p.start, end: p.end, icon: p.icon }));
  const phase = computePhase(now, activeRoutine);
  const sealed = useMemo(() => new Map(phaseEntries.map((p) => [p.phaseKey, p.status])), [phaseEntries]);
  const remainingMs = Math.max(0, phase.endDate.getTime() - now.getTime());
  const pct = phase.startDate ? Math.min(100, ((now.getTime() - phase.startDate.getTime()) / Math.max(1, phase.endDate.getTime() - phase.startDate.getTime())) * 100) : 0;

  const hm = nowHM();
  const upcomingUnsealed = activeRoutine.filter((p) => !sealed.has(p.key) && minutesOf(p.end) <= minutesOf(hm) + 1);
  const dueTimers = timers.filter((t) => t.isActive && (t.status === "late" || t.status === "soon")).slice(0, 5);
  const gamification = player?.gamification === true;

  async function setPhaseStatus(key: string, status: string) {
    await apiFetch("/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseKey: key, status }),
    });
    load();
  }

  const quote = pool[quoteIdx % pool.length] ?? pool[0];
  const phaseSealedCount = sealed.size;

  return (
    <ScreenFrame>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">
            <MapPin className="w-3 h-3 text-ember" aria-hidden="true" /> <span className="capitalize">{formatKeyFr(todayKey())}</span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">Routine</h1>
        </div>
        {player && gamification && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-smoke">Niveau {player.level}</div>
              <div className="font-display text-sm font-bold text-flame">{player.levelName}</div>
            </div>
            <div className="w-24">
              <ProgressBar value={player.pctToNext} />
              <div className="text-[9px] text-smoke mt-1 text-right">{player.xpInto}/{player.xpNext} XP</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========== PHASE ACTUELLE ========== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="lg:col-span-5">
          <Card hairline className="h-full">
            <SectionTitle icon="crosshair" title={isSunday ? "Phase actuelle · Dimanche" : "Phase actuelle"} sub={phase.current ? `${phase.current.start} — ${phase.current.end}` : "Hors routine — repos"} right={
              phase.current ? (
                <Btn small variant="outline" onClick={() => setPomoOpen(true)}>
                  <Timer className="w-3.5 h-3.5" /> Pomodoro
                </Btn>
              ) : undefined
            } />
            {phase.current ? (
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-ember/20 to-blood/10 border border-ember/30 flex items-center justify-center shrink-0 glow-ember">
                    <DynIcon name={phase.current.icon} className="w-5 h-5 text-flame" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ash leading-snug">{phase.current.title}</p>
                    <p className="text-[11px] text-smoke mt-1">Phase {phase.idx + 1}/{activeRoutine.length} · routine {isSunday ? "du Dimanche — Réflexion & Préparation" : "de la White Room"}</p>
                  </div>
                </div>
                <div className="text-center py-3">
                  <span className="font-display text-5xl font-bold text-flame text-glow tabular-nums" style={{ fontFamily: "var(--font-mono-family)" }}>
                    {pad(Math.floor(remainingMs / 3600000))}:{pad(Math.floor((remainingMs / 60000) % 60))}:{pad(Math.floor((remainingMs / 1000) % 60))}
                  </span>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-smoke mt-2">avant la rotation</p>
                </div>
                <ProgressBar value={pct} className="my-4" />
                {phase.next && (
                  <p className="text-[11px] text-smoke flex items-center gap-1.5 mb-4">
                    <ChevronRight className="w-3 h-3 text-ember" /> Suivante : <span className="text-dust">{phase.next.start} — {phase.next.title}</span>
                  </p>
                )}
                {sealed.has(phase.current.key) ? (
                  <div className={`text-center text-xs font-semibold py-2.5 rounded-lg border ${
                    sealed.get(phase.current.key) === "completed" ? "border-jade/40 text-jade bg-jade/5" : sealed.get(phase.current.key) === "skipped" ? "border-ember/40 text-ember bg-ember/5" : "border-blood/40 text-blood bg-blood/5"
                  }`}>
                    Phase scellée : {sealed.get(phase.current.key) === "completed" ? "Complétée" : sealed.get(phase.current.key) === "skipped" ? "Passée" : "Ratée"}
                    <button
                      onClick={async () => {
                        await apiFetch("/api/phases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phaseKey: phase.current!.key, status: "x", clear: true }) });
                        load();
                      }}
                      className="ml-2 underline hover:no-underline"
                    >
                      annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Btn variant="success" className="flex-1" onClick={() => setPhaseStatus(phase.current!.key, "completed")}>
                      <Check className="w-4 h-4" /> Complétée
                    </Btn>
                    <Btn className="flex-1" onClick={() => setPhaseStatus(phase.current!.key, "skipped")}>
                      <SkipForward className="w-4 h-4" /> Passer
                    </Btn>
                    <Btn variant="danger" className="flex-1" onClick={() => setPhaseStatus(phase.current!.key, "missed")}>
                      <X className="w-4 h-4" /> Ratée
                    </Btn>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <DynIcon name="moon" className="w-10 h-10 text-smoke mx-auto mb-3" />
                <p className="font-display font-bold text-ash">EXTINCTION — Sommeil</p>
                <p className="text-[11px] text-smoke mt-2 mb-4">Recharge avant l'aube. Prochaine phase : {phase.next?.title.split("—")[0].trim() ?? "LEVER"} à {phase.next?.start ?? activeRoutine[0].start}.</p>
                <span className="font-display text-3xl font-bold text-flame tabular-nums" style={{ fontFamily: "var(--font-mono-family)" }}>
                  {pad(Math.floor(remainingMs / 3600000))}:{pad(Math.floor((remainingMs / 60000) % 60))}:{pad(Math.floor((remainingMs / 1000) % 60))}
                </span>
              </div>
            )}
            {upcomingUnsealed.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-[10px] uppercase tracking-[0.18em] text-blood mb-2">Phases écoulées non scellées</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {upcomingUnsealed.slice(-4).map((p) => (
                    <div key={p.key} className="flex items-center justify-between text-[11px] bg-raise/40 border border-line rounded-lg px-2.5 py-1.5">
                      <span className="text-dust truncate">{p.start} {p.title.split("—")[0]}</span>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button onClick={() => setPhaseStatus(p.key, "completed")} aria-label={`Sceller « ${p.title} » comme complétée`} className="p-1 rounded text-jade hover:bg-jade/15"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setPhaseStatus(p.key, "missed")} aria-label={`Marquer « ${p.title} » comme ratée`} className="p-1 rounded text-blood hover:bg-blood/15"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ========== SCORE (optional gamification) ========== */}
        {gamification && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <SectionTitle icon="zap" title="Score du jour" />
            <div className="flex-1 flex flex-col items-center justify-center">
              <PowerGauge value={player?.todayScore ?? 0} label="Puissance" />
              <div className="grid grid-cols-2 gap-3 w-full mt-3">
                <div className="bg-raise/40 border border-line rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-flame font-display text-xl font-bold">
                    <Flame className="w-4 h-4" aria-hidden="true" /> {player?.streak ?? 0}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-smoke mt-1">Streak actuel</div>
                </div>
                <div className="bg-raise/40 border border-line rounded-lg p-3 text-center">
                  <div className="font-display text-xl font-bold text-ash">{player?.bestStreak ?? 0}</div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-smoke mt-1">Record</div>
                </div>
              </div>
              <p className="text-[10px] text-smoke mt-3">{phaseSealedCount}/{activeRoutine.length} phases scellées</p>
            </div>
          </Card>
        </motion.div>
        )}

        {/* ========== CITATION ========== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }} className={gamification ? "lg:col-span-4" : "lg:col-span-7"}>
          <Card className="h-full flex flex-col bg-gradient-to-br from-[#16130c] to-[#131313]" hairline>
            <SectionTitle icon="quote" title="Citation du jour" right={
              <button onClick={() => setQuoteIdx((i) => (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length)} aria-label="Autre citation" className="p-1.5 rounded-lg text-smoke hover:text-ember transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            } />
            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={quoteIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <p className="font-display text-[15px] lg:text-[17px] font-medium text-ash leading-relaxed">
                    « {quote.text} »
                  </p>
                  <footer className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-px bg-gradient-to-r from-ember to-transparent" />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-ember">{quote.character || quote.author}</span>
                    {quote.source && <span className="text-[10px] text-smoke">· {quote.source}</span>}
                    {quote.isVerbatim === false && (
                      <span className="text-[9px] text-smoke border border-smoke/25 rounded px-1.5 py-px">
                        esprit du personnage
                      </span>
                    )}
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

        {/* ========== RADAR 6 PILIERS ========== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} className="lg:col-span-4">
          <Card className="h-full">
            <SectionTitle icon="hexagon" title="Les 6 Piliers" sub="7 derniers jours — pointillés : 7 jours précédents" />
            {player ? (
              <div className="flex flex-col items-center">
                <RadarChart values={player.pillars} compare={player.pillarsPrev} size={250} />
                <div className="w-full mt-2">
                  <Bars
                    data={PILLARS.map((p) => ({ label: p.short, value: player.pillars[p.key] ?? 0, color: p.color }))}
                    max={100}
                  />
                </div>
              </div>
            ) : (
              <EmptyState icon="loader" title="Chargement…" />
            )}
          </Card>
        </motion.div>

        {/* ========== ENTRETIEN À FAIRE ========== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }} className="lg:col-span-8">
          <Card className="h-full">
            <SectionTitle
              icon="list-checks"
              title="Entretien à faire"
              sub={`${dueTimers.filter((t) => t.status === "late").length} tâche(s) en retard`}
            />
            <p className="text-[12px] text-dust mb-3">
              Tes habitudes se cochent sur la page{" "}
              <Link href="/aujourdhui" className="text-ember underline underline-offset-4">Aujourd&apos;hui</Link>.
            </p>
            {dueTimers.length === 0 ? (
              <EmptyState icon="crown" title="Aucune tâche d'entretien en attente." />
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {dueTimers.map((t) => (
                  <li key={`t-${t.id}`} className="flex items-center gap-3 py-2 border-b border-line/60">
                    <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${t.status === "late" ? "bg-blood" : "bg-ember"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] truncate ${t.status === "late" ? "text-blood" : "text-ash"}`}>{t.name}</p>
                      <p className="text-[11px] text-smoke">{TIMER_CATEGORIES[t.category] ?? t.category} · {t.status === "late" ? `${-t.remaining} j de retard` : `dans ${t.remaining} j`}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* ========== ACHIEVEMENTS (optional gamification) ========== */}
        {gamification && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="lg:col-span-12">
          <Card>
            <SectionTitle icon="trophy" title="Honneurs récents" sub={`${player?.achievements.filter((a) => a.isUnlocked).length ?? 0}/${player?.achievements.length ?? 0} distinctions débloquées`} />
            {/* Focusable so keyboard users can scroll it (WCAG 2.1.1). */}
            <div className="flex gap-3 overflow-x-auto pb-2" role="region" aria-label="Distinctions" tabIndex={0}>
              {player?.achievements.map((a) => (
                <div
                  key={a.code}
                  className={`relative shrink-0 w-36 rounded-xl border p-3 text-center transition-all ${
                    a.isUnlocked ? "border-ember/40 bg-gradient-to-b from-ember/10 to-transparent glow-ember" : "border-line bg-raise/30"
                  }`}
                >
                  <DynIcon name={a.icon} className={`w-6 h-6 mx-auto mb-2 ${a.isUnlocked ? "text-flame" : "text-smoke opacity-50"}`} />
                  <p className="text-[11px] font-semibold text-ash leading-tight">{a.name}{!a.isUnlocked && <span className="sr-only"> (verrouillée)</span>}</p>
                  <p className="text-[9px] text-smoke mt-1 leading-snug">{a.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
        )}
      </div>

      <Pomodoro open={pomoOpen} onClose={() => setPomoOpen(false)} phaseTitle={phase.current?.title ?? "Focus libre"} />
    </ScreenFrame>
  );
}
