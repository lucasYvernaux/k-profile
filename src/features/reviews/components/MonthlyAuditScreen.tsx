"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { Check, ChevronLeft, ChevronRight, ArrowRightDown as TrendingDown, ArrowRightUp as TrendingUp, Minus } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Field, Textarea, Slider, ProgressBar, EmptyState } from "@/shared/ui/primitives";
import { MonthGrid, ScoreLine, RadarChart, Bars, PowerGauge } from "@/shared/ui/charts";
import { DynIcon } from "@/shared/ui/icon";
import { PILLARS } from "@/shared/domain/constants";
import { addDays, daysInMonth, monthNameFr, todayKey } from "@/shared/lib/dates";
import { scoreTextColor } from "@/shared/ui/score-color";
import { parseJson, type PlayerData } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

type Audit = {
  month: string;
  challenge: string | null;
  skillDeveloped: string | null;
  circleNurtured: string | null;
  financialProgress: string | null;
  limitsDestroyed: string | null;
  deathAndRebirth: string | null;
  pillarScores: string | null;
  nextMonthGoals: string | null;
};

export default function MonthlyPage() {
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [saved, setSaved] = useState(false);

  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;

  const load = useCallback(async () => {
    await apiFetch("/api/bootstrap", { method: "POST" });
    const [p, a] = await Promise.all([
      apiFetch(`/api/player?from=${first}&to=${last}`, { cache: "no-store" }).then((r) => r.json()),
      apiFetch(`/api/reviews?type=monthly&key=${month}`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    setPlayer(p);
    setAudit(a ?? { month, pillarScores: JSON.stringify({}), challenge: null, skillDeveloped: null, circleNurtured: null, financialProgress: null, limitsDestroyed: null, deathAndRebirth: null, nextMonthGoals: null });
  }, [first, last, month]);

  useEffect(() => { load(); }, [load]);

  async function save(patch: Record<string, unknown>) {
    const merged = { ...audit, month, ...patch } as Audit;
    await apiFetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "monthly", ...merged, pillarScores: merged.pillarScores ? parseJson(merged.pillarScores, {}) : undefined }),
    });
    setAudit(merged);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const days = player?.range.days ?? [];
  const scoreMap = useMemo(() => new Map(days.map((d) => [d.date, d.score])), [days]);
  const goodDays = days.filter((d) => d.score >= 80).length;
  const best = days.reduce((acc, d) => (d.score > (acc?.score ?? -1) ? d : acc), days[0] ?? null);
  const worst = days.reduce((acc, d) => (d.score < (acc?.score ?? 101) ? d : acc), days[0] ?? null);
  const longestStreak = useMemo(() => {
    let bestR = 0, run = 0;
    for (let i = 1; i <= daysInMonth(month); i++) {
      const key = `${month}-${String(i).padStart(2, "0")}`;
      if ((scoreMap.get(key) ?? 0) >= 70) { run++; bestR = Math.max(bestR, run); } else run = 0;
    }
    return bestR;
  }, [scoreMap, month]);

  const linePts = useMemo(() => {
    return Array.from({ length: daysInMonth(month) }, (_, i) => {
      const key = `${month}-${String(i + 1).padStart(2, "0")}`;
      return { label: String(i + 1), value: scoreMap.has(key) ? scoreMap.get(key)! : null };
    });
  }, [month, scoreMap]);

  const pillars = player?.pillars ?? {};
  const pillarsPrev = player?.pillarsPrev ?? {};
  const selfScores = parseJson<Record<string, number>>(audit?.pillarScores, {});
  const r = player?.range;

  return (
    <ScreenFrame title="L'Audit">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">L'Audit de l'Architecte — Mensuel</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">{monthNameFr(month)}</h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setMonth(addDays(`${month}-01`, -31).slice(0, 7))} aria-label="Mois précédent" className="p-2 rounded-lg text-smoke hover:text-ash border border-line"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setMonth(todayKey().slice(0, 7))} className="text-[11px] px-3 rounded-lg text-dust hover:text-ash border border-line">Ce mois</button>
          <button onClick={() => setMonth(addDays(`${month}-01`, 31).slice(0, 7))} aria-label="Mois suivant" className="p-2 rounded-lg text-smoke hover:text-ash border border-line"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ========== NIVEAU & PROGRESSION ========== */}
      {player && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Card hairline className="bg-gradient-to-r from-[#181207] via-[#131315] to-[#131315]">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ember/25 to-blood/10 border border-ember/40 flex items-center justify-center glow-ember">
                  <span className="font-display text-2xl font-bold text-flame" style={{ fontFamily: "var(--font-mono-family)" }}>{player.level}</span>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-smoke">Rang actuel</p>
                  <p className="font-display text-xl font-bold text-ash">{player.levelName}</p>
                  <p className="text-[11px] text-ember">{player.levelSubtitle}</p>
                </div>
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="flex justify-between text-[10px] text-smoke mb-1.5">
                  <span>Niv. {player.level}</span>
                  <span className="text-dust">{player.xp} XP total — {player.xpNext - player.xpInto} XP avant le niveau {player.level + 1}</span>
                  <span>Niv. {player.level + 1}</span>
                </div>
                <ProgressBar value={player.pctToNext} className="h-2.5" />
              </div>
              <div className="flex gap-5">
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-flame">{player.streak}</p>
                  <p className="text-[9px] uppercase tracking-widest text-smoke">Streak ≥80</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-ash">{player.bestStreak}</p>
                  <p className="text-[9px] uppercase tracking-widest text-smoke">Record</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* ========== CALENDRIER + COURBE ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="lg:col-span-5">
          <Card className="h-full" hairline>
            <SectionTitle icon="calendar-days" title="Carte thermique du mois" sub={`${goodDays} jour(s) ≥ 80%`} />
            <MonthGrid month={month} scores={scoreMap} />
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
                <p className="font-display text-lg font-bold text-flame">{longestStreak}</p>
                <p className="text-[8.5px] uppercase tracking-widest text-smoke">Streak max (≥70)</p>
              </div>
              <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
                <p className="font-display text-lg font-bold" style={{ color: best ? scoreTextColor(best.score) : "#a0a0a0" }}>{best ? `${Math.round(best.score)}%` : "—"}</p>
                <p className="text-[8.5px] uppercase tracking-widest text-smoke">Meilleur : {best ? `le ${Number(best.date.slice(8))}` : "—"}</p>
              </div>
              <div className="bg-raise/40 border border-line rounded-lg p-2.5 text-center">
                <p className="font-display text-lg font-bold" style={{ color: worst ? scoreTextColor(worst.score) : "#a0a0a0" }}>{worst ? `${Math.round(worst.score)}%` : "—"}</p>
                <p className="text-[8.5px] uppercase tracking-widest text-smoke">Pire : {worst ? `le ${Number(worst.date.slice(8))}` : "—"}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="lg:col-span-7">
          <Card className="h-full">
            <SectionTitle icon="trending-up" title="Évolution du score quotidien" sub="Chaque point = un jour" />
            <ScoreLine points={linePts} height={210} />
            {days.length === 0 && <EmptyState icon="activity" title="Aucune donnée ce mois." sub="Scelle des habitudes dans l'Arsenal pour alimenter la courbe." />}
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* ========== PILIERS MOIS ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-5">
          <Card className="h-full">
            <SectionTitle icon="hexagon" title="Progression des 6 piliers" sub="Ce mois vs mois précédent (pointillés)" />
            <div className="flex flex-col items-center">
              <RadarChart values={pillars} compare={pillarsPrev} size={230} />
              <div className="w-full space-y-2">
                {PILLARS.map((p) => {
                  const diff = (pillars[p.key] ?? 0) - (pillarsPrev[p.key] ?? 0);
                  const trend = diff > 3 ? "up" : diff < -3 ? "down" : "flat";
                  return (
                    <div key={p.key} className="flex items-center gap-2 text-[11px]">
                      <span className="w-20 text-dust">{p.short}</span>
                      <div className="flex-1"><ProgressBar value={pillars[p.key] ?? 0} color={p.color} /></div>
                      <span className="w-8 text-right font-semibold" style={{ color: p.color }}>{pillars[p.key] ?? 0}</span>
                      {trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-jade" /> : trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-blood" /> : <Minus className="w-3.5 h-3.5 text-smoke" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ========== STATS MENSUELLES ========== */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="lg:col-span-7">
          <Card className="h-full">
            <SectionTitle icon="bar-chart-3" title="Statistiques mensuelles détaillées" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: "Deep Work", v: `${Math.round(((r?.deepWorkMin ?? 0) + (r?.practiceMin ?? 0)) / 60)} h`, icon: "brain" },
                { label: "Entraînement", v: `${Math.round((r?.trainingMin ?? 0) / 60)} h`, icon: "dumbbell" },
                { label: "Lecture", v: `${r?.pagesRead ?? 0} pages`, icon: "book" },
                { label: "Méditations", v: `${r?.medSessions ?? 0} sessions`, icon: "moon-star" },
                { label: "Journaux", v: `${r?.journalDays ?? 0} entrées`, icon: "notebook-pen" },
                { label: "Habitudes scellées", v: `${r?.habitDoneCount ?? 0}`, icon: "check-circle" },
              ].map((s) => (
                <div key={s.label} className="bg-raise/40 border border-line rounded-lg p-3.5 hover:border-ember/30 transition-colors">
                  <DynIcon name={s.icon} className="w-4 h-4 text-ember mb-2" />
                  <p className="font-display text-lg font-bold text-ash">{s.v}</p>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-smoke mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <PowerGauge value={r?.avgScore ?? 0} size={130} label="Score moyen" />
              <div className="flex-1">
                <Bars data={PILLARS.map((p) => ({ label: p.short, value: pillars[p.key] ?? 0, color: p.color }))} max={100} />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ========== AUDIT MENSUEL ========== */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <Card hairline>
          <SectionTitle icon="scroll" title="Audit mensuel" sub="Rituel de fin de mois" right={saved ? <span className="text-jade text-[10px] flex items-center gap-1"><Save className="w-3 h-3" /> Sauvegardé</span> : undefined} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3.5">
            <Field label="Quel défi significatif ai-je relevé ce mois ?"><Textarea rows={2} defaultValue={audit?.challenge ?? ""} onBlur={(e) => save({ challenge: e.target.value })} /></Field>
            <Field label="Quelle compétence ai-je développée ou approfondie ?"><Textarea rows={2} defaultValue={audit?.skillDeveloped ?? ""} onBlur={(e) => save({ skillDeveloped: e.target.value })} /></Field>
            <Field label="Mon cercle intime : l'ai-je nourri et protégé ?"><Textarea rows={2} defaultValue={audit?.circleNurtured ?? ""} onBlur={(e) => save({ circleNurtured: e.target.value })} /></Field>
            <Field label="Finances : suis-je en progression vers l'autonomie ?"><Textarea rows={2} defaultValue={audit?.financialProgress ?? ""} onBlur={(e) => save({ financialProgress: e.target.value })} /></Field>
            <Field label="Quelles anciennes limites ai-je brûlées ce mois ?"><Textarea rows={2} defaultValue={audit?.limitsDestroyed ?? ""} onBlur={(e) => save({ limitsDestroyed: e.target.value })} /></Field>
            <Field label="Quelle version de moi est morte ? Quelle version est née ?"><Textarea rows={2} defaultValue={audit?.deathAndRebirth ?? ""} onBlur={(e) => save({ deathAndRebirth: e.target.value })} /></Field>
          </div>
          <div className="mt-5 pt-4 border-t border-line">
            <p className="text-[10px] uppercase tracking-[0.18em] text-smoke mb-3">Auto-évaluation par pilier (1–10)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {PILLARS.map((p) => (
                <Slider
                  key={p.key}
                  label={p.name}
                  value={selfScores[p.key] ?? 5}
                  onChange={(v) => save({ pillarScores: JSON.stringify({ ...selfScores, [p.key]: v }) })}
                />
              ))}
            </div>
          </div>
          <div className="mt-5">
            <Field label="Objectifs pour le mois prochain (un par pilier minimum)"><Textarea rows={3} defaultValue={audit?.nextMonthGoals ?? ""} onBlur={(e) => save({ nextMonthGoals: e.target.value })} placeholder={"Forge : …\nAcadémie : …\nArtisanat : …"} /></Field>
          </div>
        </Card>
      </motion.div>

      {/* ========== ACHIEVEMENTS ========== */}
      {player && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mt-4">
          <Card>
            <SectionTitle icon="trophy" title="Badges & Distinctions" sub={`${player.achievements.filter((a) => a.isUnlocked).length}/${player.achievements.length} débloqués`} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
              {player.achievements.map((a) => (
                <div key={a.code} className={`relative rounded-xl border p-3.5 text-center transition-all ${a.isUnlocked ? "border-ember/40 bg-gradient-to-b from-ember/10 to-transparent" : "border-line bg-raise/30"}`}>
                  <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${a.isUnlocked ? "bg-ember/15 glow-ember" : "bg-raise/60"}`}>
                    <DynIcon name={a.icon} className={`w-5 h-5 ${a.isUnlocked ? "text-flame" : "text-smoke opacity-50"}`} />
                  </div>
                  <p className="text-[11px] font-semibold text-ash">{a.name}{!a.isUnlocked && <span className="sr-only"> (verrouillée)</span>}</p>
                  <p className="text-[9px] text-smoke mt-1 leading-snug">{a.description}</p>
                  {a.isUnlocked && a.unlockedAt && <p className="text-[8.5px] text-ember mt-1.5 flex items-center justify-center gap-1"><Check className="w-2.5 h-2.5" /> {a.unlockedAt}</p>}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </ScreenFrame>
  );
}
