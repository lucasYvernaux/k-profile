"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { AlertTriangle, Check, Clock, Plus, Search, Star, Trash as Trash2, Pen as Pencil } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, Field, Input, Select, Textarea, EmptyState } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import { PILLARS, TIMER_CATEGORIES } from "@/shared/domain/constants";
import { DAY_FULL, DAY_LABELS, minutesOf, todayKey } from "@/shared/lib/dates";
import { SUNDAY_ONLY, WEEKDAYS_MON_SAT } from "@/shared/domain/constants";
import { QUOTE_CATEGORIES } from "@/features/manifesto/domain/quotes";
import type { TimerRow } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

type Tab = "phases" | "timers" | "quotes";

type QuoteRow = {
  id: number;
  text: string;
  author: string;
  source: string | null;
  character: string | null;
  isVerbatim: boolean;
  category: string;
  isFavorite: boolean;
  isActive: boolean;
};

type PhaseDef = {
  id: number;
  key: string;
  title: string;
  startTime: string;
  endTime: string;
  icon: string;
  pillar: string | null;
  daysOfWeek: string | null;
  isActive: boolean;
  sortOrder: number;
};

/** Portée d'affichage des phases dans l'Atelier */
type Scope = "week" | "sunday" | "all";

function daysOf(p: { daysOfWeek: string | null }): number[] {
  if (!p.daysOfWeek) return [0, 1, 2, 3, 4, 5, 6];
  try {
    const d = JSON.parse(p.daysOfWeek) as number[];
    return Array.isArray(d) && d.length ? d : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

function scopeLabel(days: number[]): string {
  if (days.length === 7) return "Tous les jours";
  if (days.length === 6 && !days.includes(0)) return "Lun → Sam";
  if (days.length === 1) return DAY_FULL[days[0]];
  return days.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map((d) => DAY_LABELS[d]).join(" · ");
}

const ICONS = ["flame", "brain", "book-open", "dumbbell", "puzzle", "shower-head", "coffee", "book", "swords", "leaf",
  "graduation-cap", "hammer", "footprints", "bar-chart-3", "utensils", "moon-star", "notebook-pen", "clipboard-list",
  "moon", "sun", "sunrise", "timer", "bed", "trash-2", "recycle", "scissors", "car", "wallet", "phone", "users",
  "glass-water", "shield", "target", "zap", "heart-pulse", "code", "music", "coins"];

function IconPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
      {ICONS.map((ic) => (
        <button
          key={ic}
          type="button"
          onClick={() => onChange(ic)}
          aria-label={`Icône ${ic}`}
          aria-pressed={value === ic}
          title={ic}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
            value === ic ? "border-ember bg-ember/15 text-ember" : "border-line text-smoke hover:text-dust hover:border-line2"
          }`}
        >
          <DynIcon name={ic} className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>("phases");
  const [phases, setPhases] = useState<PhaseDef[]>([]);
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [editQuote, setEditQuote] = useState<Partial<QuoteRow> | null>(null);
  const [qCat, setQCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("week");
  const [toast, setToast] = useState("");

  const [editPhase, setEditPhase] = useState<Partial<PhaseDef> | null>(null);
  const [editTimer, setEditTimer] = useState<Partial<TimerRow> | null>(null);
  const [confirm, setConfirm] = useState<{ label: string; action: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    await apiFetch("/api/bootstrap", { method: "POST" });
    const [p, t, qs] = await Promise.all([
      apiFetch("/api/phase-defs", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/timers", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/quotes", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setPhases(p);
    setTimers(t.timers);
    setQuotes(qs);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  /* ---------------- PHASES ---------------- */
  async function savePhase() {
    if (!editPhase?.title || !editPhase.startTime || !editPhase.endTime) return flash("Titre et horaires requis.");
    if (minutesOf(editPhase.endTime) <= minutesOf(editPhase.startTime)) return flash("L'heure de fin doit suivre le début.");
    if (editPhase.id) {
      await apiFetch(`/api/phase-defs/${editPhase.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editPhase) });
    } else {
      await apiFetch("/api/phase-defs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editPhase) });
    }
    setEditPhase(null); await load(); flash("Phase enregistrée.");
  }

  // Phases visibles selon la portée sélectionnée
  const scoped = useMemo(() => {
    if (scope === "all") return phases;
    const target = scope === "sunday" ? 0 : 1; // dimanche vs jour de semaine type (lundi)
    return phases.filter((p) => daysOf(p).includes(target));
  }, [phases, scope]);

  // Détection de chevauchements / trous dans la routine affichée
  const timeline = useMemo(() => {
    const act = scoped.filter((p) => p.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const issues: string[] = [];
    for (let i = 0; i < act.length - 1; i++) {
      const cur = act[i], nxt = act[i + 1];
      if (minutesOf(cur.endTime) > minutesOf(nxt.startTime)) issues.push(`Chevauchement : « ${cur.title.split("—")[0].trim()} » et « ${nxt.title.split("—")[0].trim()} »`);
      else if (minutesOf(cur.endTime) < minutesOf(nxt.startTime)) issues.push(`Trou de ${minutesOf(nxt.startTime) - minutesOf(cur.endTime)} min après « ${cur.title.split("—")[0].trim()} »`);
    }
    const covered = act.reduce((s, p) => s + (minutesOf(p.endTime) - minutesOf(p.startTime)), 0);
    return { act, issues, covered };
  }, [scoped]);

  /* ---------------- TIMERS ---------------- */
  async function saveTimer() {
    if (!editTimer?.name || !editTimer.frequencyDays) return flash("Nom et fréquence requis.");
    if (editTimer.id) {
      await apiFetch(`/api/timers/${editTimer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editTimer) });
    } else {
      await apiFetch("/api/timers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editTimer) });
    }
    setEditTimer(null); await load(); flash("Cycle enregistré.");
  }

  /* ---------------- QUOTES ---------------- */
  async function saveQuote() {
    if (!editQuote?.text?.trim()) return flash("Le texte de la citation est requis.");
    if (editQuote.id) {
      await apiFetch("/api/quotes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editQuote) });
    } else {
      await apiFetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editQuote) });
    }
    setEditQuote(null); await load(); flash("Citation enregistrée.");
  }

  const fq = quotes.filter(
    (x) =>
      (qCat === "all" || x.category === qCat) &&
      (!q || x.text.toLowerCase().includes(q.toLowerCase()) || x.author.toLowerCase().includes(q.toLowerCase()))
  );

  const ft = timers.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));
  const fp = scoped.filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()));

  const counts = { phases: phases.filter((p) => p.isActive).length, timers: timers.filter((t) => t.isActive).length };

  return (
    <ScreenFrame>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Atelier — Forge de la Routine</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">
            Atelier : {counts.phases} phases · {counts.timers} tâches d'entretien
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-smoke" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…"
              className="bg-inset border border-border rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-ash focus:outline-none focus:border-ember w-36" />
          </div>
          <div className="flex bg-raise/60 border border-line rounded-lg p-0.5">
            {([["phases", "Phases"], ["timers", "Entretien"], ["quotes", "Citations"]] as [Tab, string][]).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} className={`text-[11px] px-3 py-1.5 rounded-md transition-all ${tab === t ? "bg-ember text-black font-semibold" : "text-dust hover:text-ash"}`}>{l}</button>
            ))}
          </div>
          <Btn variant="primary" small onClick={() => {
            if (tab === "phases") setEditPhase({
              icon: "flame",
              startTime: scope === "sunday" ? "08:30" : "07:30",
              endTime: scope === "sunday" ? "09:00" : "08:00",
              isActive: true,
              daysOfWeek: JSON.stringify(scope === "sunday" ? SUNDAY_ONLY : scope === "week" ? WEEKDAYS_MON_SAT : [0, 1, 2, 3, 4, 5, 6]),
            });
            else if (tab === "quotes") setEditQuote({ category: qCat === "all" ? "perso" : qCat, isActive: true, isFavorite: false, author: "" });
            else setEditTimer({ category: "menage", frequencyDays: 7, icon: "timer", isActive: true });
          }}>
            <Plus className="w-3.5 h-3.5" /> Créer
          </Btn>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 lg:top-20 right-6 z-50 bg-jade/10 border border-jade/40 text-jade text-[11.5px] px-4 py-2.5 rounded-lg backdrop-blur">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== PHASES ==================== */}
      {tab === "phases" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.2em] text-smoke">Routine :</span>
            {([["week", "Semaine (Lun → Sam)"], ["sunday", "Dimanche"], ["all", "Toutes"]] as [Scope, string][]).map(([s, l]) => (
              <button key={s} onClick={() => setScope(s)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${scope === s ? "border-ember bg-ember/15 text-ember font-semibold" : "border-line text-smoke hover:text-dust"}`}>
                {l}
              </button>
            ))}
            <span className="text-[10px] text-smoke ml-auto">{fp.length} phase(s) affichée(s)</span>
          </div>
          {timeline.issues.length > 0 && (
            <Card className="border-ember/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-ember shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] text-ash font-semibold mb-1">Cohérence de la routine</p>
                  <ul className="space-y-0.5">
                    {timeline.issues.slice(0, 5).map((i, n) => <li key={n} className="text-[11px] text-smoke">· {i}</li>)}
                  </ul>
                  <p className="text-[10px] text-smoke mt-1.5">Couverture totale : {Math.floor(timeline.covered / 60)}h{String(timeline.covered % 60).padStart(2, "0")} — les trous sont tolérés (temps libre).</p>
                </div>
              </div>
            </Card>
          )}
          <Card hairline>
            <SectionTitle
              icon="clock"
              title={scope === "sunday" ? "Routine du Dimanche" : scope === "week" ? "Routine de semaine (Lun → Sam)" : "Toutes les phases"}
              sub={scope === "sunday" ? "Réflexion & Préparation — cycle hebdomadaire du manifeste" : "Ordonnées par heure de début — le Quartier Général suit cette routine"}
              right={
                <Btn small onClick={() => setConfirm({
                  label: "Réinitialiser la routine aux 20 phases par défaut du manifeste ? Les phases personnalisées seront perdues.",
                  action: async () => { await apiFetch("/api/phase-defs", { method: "PUT" }); await load(); flash("Routine réinitialisée."); },
                })}><RotateCcw className="w-3.5 h-3.5" /> Réinitialiser</Btn>
              } />
            {fp.length === 0 ? <EmptyState icon="clock" title="Aucune phase." sub="Crée la première étape de ta journée." /> : (
              <div className="space-y-1.5">
                {[...fp].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((p) => {
                  const dur = minutesOf(p.endTime) - minutesOf(p.startTime);
                  return (
                    <motion.div key={p.id} layout className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${p.isActive ? "border-line bg-raise/30" : "border-line/50 bg-raise/10 opacity-50"}`}>
                      <div className="font-display text-[12px] font-bold text-flame tabular-nums shrink-0 w-[92px]" style={{ fontFamily: "var(--font-mono-family)" }}>
                        {p.startTime}–{p.endTime}
                      </div>
                      <div className="w-8 h-8 rounded-lg border border-ember/25 bg-ember/10 flex items-center justify-center shrink-0">
                        <DynIcon name={p.icon} className="w-4 h-4 text-ember" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-ash truncate">{p.title}</p>
                        <p className="text-[10px] text-smoke flex items-center gap-1.5 flex-wrap">
                          <span>{dur} min</span>
                          <span className="text-smoke">·</span>
                          <span className={`px-1.5 py-px rounded border text-[9px] ${daysOf(p).includes(0) && daysOf(p).length === 1 ? "border-[#a78bfa]/40 text-[#a78bfa]" : "border-line2 text-smoke"}`}>
                            {scopeLabel(daysOf(p))}
                          </span>
                        </p>
                      </div>
                      <button onClick={async () => { await apiFetch(`/api/phase-defs/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) }); load(); }}
                        title={p.isActive ? "Désactiver" : "Activer"} aria-label={`${p.isActive ? "Désactiver" : "Activer"} la phase « ${p.title} »`} className={`p-1.5 rounded-lg transition-colors ${p.isActive ? "text-jade hover:bg-jade/10" : "text-smoke hover:text-dust"}`}>
                        {p.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditPhase({ ...p })} title="Modifier" aria-label={`Modifier la phase « ${p.title} »`} className="p-1.5 rounded-lg text-smoke hover:text-dust"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirm({ label: `Supprimer la phase « ${p.title} » ? Son historique de complétion sera effacé.`, action: async () => { await apiFetch(`/api/phase-defs/${p.id}`, { method: "DELETE" }); await load(); flash("Phase supprimée."); } })}
                        title="Supprimer" aria-label={`Supprimer la phase « ${p.title} »`} className="p-1.5 rounded-lg text-smoke hover:text-blood"><Trash2 className="w-3.5 h-3.5" /></button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== TIMERS ==================== */}
      {tab === "timers" && (
        <div className="space-y-4">
          {Object.entries(TIMER_CATEGORIES).map(([cat, label]) => {
            const list = ft.filter((t) => t.category === cat);
            if (list.length === 0) return null;
            return (
              <Card key={cat}>
                <SectionTitle icon="radar" title={label} sub={`${list.length} cycle(s)`} />
                <div className="space-y-1.5">
                  {list.map((t) => (
                    <motion.div key={t.id} layout className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${t.isActive ? "border-line bg-raise/30" : "border-line/50 bg-raise/10 opacity-50"}`}>
                      <div className="w-8 h-8 rounded-lg border border-ember/25 bg-ember/10 flex items-center justify-center shrink-0">
                        <DynIcon name={t.icon} className="w-4 h-4 text-ember" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-ash truncate">{t.name}</p>
                        <p className="text-[10px] text-smoke">Tous les {t.frequencyDays} j · dernier : {t.lastDone ?? "jamais"} · prochain : {t.nextDue ?? "—"}</p>
                      </div>
                      <button onClick={async () => { await apiFetch(`/api/timers/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !t.isActive }) }); load(); }}
                        title={t.isActive ? "Désactiver" : "Activer"} aria-label={`${t.isActive ? "Désactiver" : "Activer"} le cycle « ${t.name} »`} className={`p-1.5 rounded-lg transition-colors ${t.isActive ? "text-jade hover:bg-jade/10" : "text-smoke hover:text-dust"}`}>
                        {t.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditTimer({ ...t })} title="Modifier" aria-label={`Modifier le cycle « ${t.name} »`} className="p-1.5 rounded-lg text-smoke hover:text-dust"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirm({ label: `Supprimer le cycle « ${t.name} » ?`, action: async () => { await apiFetch(`/api/timers/${t.id}`, { method: "DELETE" }); await load(); flash("Cycle supprimé."); } })}
                        title="Supprimer" aria-label={`Supprimer le cycle « ${t.name} »`} className="p-1.5 rounded-lg text-smoke hover:text-blood"><Trash2 className="w-3.5 h-3.5" /></button>
                    </motion.div>
                  ))}
                </div>
              </Card>
            );
          })}
          {ft.length === 0 && <Card><EmptyState icon="radar" title="Aucun cycle." /></Card>}
        </div>
      )}

      {/* ==================== QUOTES ==================== */}
      {tab === "quotes" && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setQCat("all")}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${qCat === "all" ? "border-ember bg-ember/15 text-ember font-semibold" : "border-line text-smoke hover:text-dust"}`}>
              Toutes ({quotes.length})
            </button>
            {Object.entries(QUOTE_CATEGORIES).map(([k, meta]) => {
              const n = quotes.filter((x) => x.category === k).length;
              if (n === 0 && k !== "perso") return null;
              return (
                <button key={k} onClick={() => setQCat(k)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${qCat === k ? "font-semibold" : "text-smoke hover:text-dust"}`}
                  style={qCat === k ? { borderColor: meta.color, background: `${meta.color}22`, color: meta.color } : { borderColor: "#262626" }}>
                  {meta.label} ({n})
                </button>
              );
            })}
          </div>

          <Card hairline>
            <SectionTitle icon="quote" title={qCat === "all" ? "Toutes les citations" : QUOTE_CATEGORIES[qCat]?.label ?? "Citations"}
              sub={`${fq.length} affichée(s) · ${quotes.filter((x) => x.isFavorite).length} favorite(s) · les inactives sont exclues du tirage`} />
            {fq.length === 0 ? (
              <EmptyState icon="quote" title="Aucune citation ici." sub="Ajoute la tienne avec le bouton Créer." />
            ) : (
              <div className="space-y-1.5">
                {fq.map((x) => {
                  const meta = QUOTE_CATEGORIES[x.category];
                  return (
                    <motion.div key={x.id} layout className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${x.isActive ? "border-line bg-raise/30" : "border-line/50 bg-raise/10 opacity-50"}`}>
                      <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: meta?.color ?? "#a0a0a0" }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-ash leading-relaxed">« {x.text} »</p>
                        <p className="text-[10px] text-smoke mt-1 flex items-center gap-1.5 flex-wrap">
                          <span style={{ color: meta?.color }}>{x.character || x.author}</span>
                          {x.source ? <span className="text-smoke">· {x.source}</span> : null}
                          {!x.isVerbatim && (
                            <span className="px-1.5 py-px rounded border border-smoke/30 text-smoke text-[8.5px] uppercase tracking-wider" title="Maxime inspirée du personnage, pas une réplique exacte">
                              esprit du personnage
                            </span>
                          )}
                        </p>
                      </div>
                      <button onClick={async () => { await apiFetch("/api/quotes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: x.id, isFavorite: !x.isFavorite }) }); load(); }}
                        title="Favori" aria-label={`Favori : citation de ${x.author}`} aria-pressed={!!x.isFavorite} className={`p-1.5 rounded-lg transition-colors shrink-0 ${x.isFavorite ? "text-flame" : "text-smoke hover:text-dust"}`}>
                        <Star className="w-3.5 h-3.5" fill={x.isFavorite ? "currentColor" : "none"} />
                      </button>
                      <button onClick={async () => { await apiFetch("/api/quotes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: x.id, isActive: !x.isActive }) }); load(); }}
                        title={x.isActive ? "Désactiver" : "Activer"} aria-label={`${x.isActive ? "Désactiver" : "Activer"} la citation de ${x.author}`} className={`p-1.5 rounded-lg transition-colors shrink-0 ${x.isActive ? "text-jade hover:bg-jade/10" : "text-smoke hover:text-dust"}`}>
                        {x.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditQuote({ ...x })} title="Modifier" aria-label={`Modifier la citation de ${x.author}`} className="p-1.5 rounded-lg text-smoke hover:text-dust shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirm({ label: `Supprimer cette citation de ${x.author} ?`, action: async () => { await apiFetch(`/api/quotes?id=${x.id}`, { method: "DELETE" }); await load(); flash("Citation supprimée."); } })}
                        title="Supprimer" aria-label={`Supprimer la citation de ${x.author}`} className="p-1.5 rounded-lg text-smoke hover:text-blood shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== MODAL QUOTE ==================== */}
      <Modal open={Boolean(editQuote)} onClose={() => setEditQuote(null)} title={editQuote?.id ? "Modifier la citation" : "Nouvelle citation"} wide>
        {editQuote && (
          <div className="space-y-3.5">
            <Field label="Texte de la citation">
              <Textarea rows={3} value={editQuote.text ?? ""} onChange={(e) => setEditQuote({ ...editQuote, text: e.target.value })}
                placeholder="La discipline est le pont entre les objectifs et l'accomplissement." />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Auteur affiché">
                <Input value={editQuote.author ?? ""} onChange={(e) => setEditQuote({ ...editQuote, author: e.target.value })} placeholder="Sung Jin-Woo, Sénèque, moi-même…" />
              </Field>
              <Field label="Personnage (si anime)">
                <Input value={editQuote.character ?? ""} onChange={(e) => setEditQuote({ ...editQuote, character: e.target.value })} placeholder="Kiyotaka Ayanokōji" />
              </Field>
              <Field label="Source / Œuvre (optionnel)">
                <Input value={editQuote.source ?? ""} onChange={(e) => setEditQuote({ ...editQuote, source: e.target.value })} placeholder="Classroom of the Elite, S2E7…" />
              </Field>
              <Field label="Nature de la citation">
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setEditQuote({ ...editQuote, isVerbatim: true })}
                    className={`flex-1 text-[10.5px] py-2 rounded-lg border transition-all ${editQuote.isVerbatim !== false ? "border-jade bg-jade/15 text-jade font-semibold" : "border-line text-smoke hover:text-dust"}`}>
                    Réplique exacte
                  </button>
                  <button type="button" onClick={() => setEditQuote({ ...editQuote, isVerbatim: false })}
                    className={`flex-1 text-[10.5px] py-2 rounded-lg border transition-all ${editQuote.isVerbatim === false ? "border-ember bg-ember/15 text-ember font-semibold" : "border-line text-smoke hover:text-dust"}`}>
                    Esprit du personnage
                  </button>
                </div>
              </Field>
            </div>
            <p className="text-[10px] text-smoke leading-relaxed -mt-1">
              « Réplique exacte » = tu as vérifié la formulation. « Esprit du personnage » = maxime inspirée de sa philosophie, signalée comme telle pour éviter toute fausse attribution.
            </p>
            <Field label="Catégorie">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(QUOTE_CATEGORIES).map(([k, meta]) => (
                  <button key={k} type="button" onClick={() => setEditQuote({ ...editQuote, category: k })}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${editQuote.category === k ? "font-semibold" : "text-smoke hover:text-dust"}`}
                    style={editQuote.category === k ? { borderColor: meta.color, background: `${meta.color}22`, color: meta.color } : { borderColor: "#262626" }}>
                    {meta.label}
                  </button>
                ))}
              </div>
            </Field>
            {editQuote.text && (
              <div className="rounded-xl border border-ember/25 bg-ember/[0.04] px-4 py-3">
                <p className="text-[9px] uppercase tracking-[0.2em] text-smoke mb-1.5">Aperçu au Quartier Général</p>
                <p className="font-display text-[15px] text-ash leading-relaxed">« {editQuote.text} »</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ember mt-2">
                  {editQuote.character || editQuote.author || "Anonyme"}
                  {editQuote.isVerbatim === false && <span className="text-smoke normal-case tracking-normal"> · esprit du personnage</span>}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-line">
              {editQuote.id ? (
                <Btn variant="danger" small onClick={() => { const id = editQuote.id!; setEditQuote(null); setConfirm({ label: "Supprimer cette citation ?", action: async () => { await apiFetch(`/api/quotes?id=${id}`, { method: "DELETE" }); await load(); flash("Citation supprimée."); } }); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </Btn>
              ) : <span />}
              <Btn variant="primary" onClick={saveQuote}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL PHASE ==================== */}
      <Modal open={Boolean(editPhase)} onClose={() => setEditPhase(null)} title={editPhase?.id ? "Modifier la phase" : "Nouvelle phase"}>
        {editPhase && (
          <div className="space-y-3.5">
            <Field label="Titre de la phase"><Input value={editPhase.title ?? ""} onChange={(e) => setEditPhase({ ...editPhase, title: e.target.value })} placeholder="Ex : FORGE CORPORELLE — Entraînement" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début"><Input type="time" value={editPhase.startTime ?? ""} onChange={(e) => setEditPhase({ ...editPhase, startTime: e.target.value })} /></Field>
              <Field label="Fin"><Input type="time" value={editPhase.endTime ?? ""} onChange={(e) => setEditPhase({ ...editPhase, endTime: e.target.value })} /></Field>
            </div>
            {editPhase.startTime && editPhase.endTime && minutesOf(editPhase.endTime) > minutesOf(editPhase.startTime) && (
              <p className="text-[10.5px] text-ember flex items-center gap-1.5"><Clock className="w-3 h-3" /> Durée : {minutesOf(editPhase.endTime) - minutesOf(editPhase.startTime)} minutes</p>
            )}
            <Field label="Jours d'application">
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const cur = daysOf({ daysOfWeek: editPhase.daysOfWeek ?? null });
                  const on = cur.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const next = on ? cur.filter((x) => x !== d) : [...cur, d];
                        setEditPhase({ ...editPhase, daysOfWeek: JSON.stringify(next.length ? next.sort() : [d]) });
                      }}
                      className={`w-10 h-9 rounded-lg border text-[11px] font-semibold transition-all ${
                        on ? "border-ember bg-ember/15 text-ember" : "border-line text-smoke hover:text-dust"
                      }`}
                    >
                      {DAY_LABELS[d]}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                <button type="button" onClick={() => setEditPhase({ ...editPhase, daysOfWeek: JSON.stringify(WEEKDAYS_MON_SAT) })}
                  className="text-[10px] px-2 py-1 rounded border border-line text-smoke hover:text-ember hover:border-ember/40 transition-all">Lun → Sam</button>
                <button type="button" onClick={() => setEditPhase({ ...editPhase, daysOfWeek: JSON.stringify(SUNDAY_ONLY) })}
                  className="text-[10px] px-2 py-1 rounded border border-line text-smoke hover:text-ember hover:border-ember/40 transition-all">Dimanche seul</button>
                <button type="button" onClick={() => setEditPhase({ ...editPhase, daysOfWeek: JSON.stringify([0, 1, 2, 3, 4, 5, 6]) })}
                  className="text-[10px] px-2 py-1 rounded border border-line text-smoke hover:text-ember hover:border-ember/40 transition-all">Tous les jours</button>
              </div>
            </Field>
            <Field label="Icône"><IconPicker value={editPhase.icon} onChange={(v) => setEditPhase({ ...editPhase, icon: v })} /></Field>
            <Field label="Pilier associé (optionnel)">
              <Select value={editPhase.pillar ?? ""} onChange={(e) => setEditPhase({ ...editPhase, pillar: e.target.value || null })}>
                <option value="">—</option>
                {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-center justify-between pt-3 border-t border-line">
              {editPhase.id ? (
                <Btn variant="danger" small onClick={() => { const id = editPhase.id!; const title = editPhase.title; setEditPhase(null); setConfirm({ label: `Supprimer la phase « ${title} » ?`, action: async () => { await apiFetch(`/api/phase-defs/${id}`, { method: "DELETE" }); await load(); flash("Phase supprimée."); } }); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </Btn>
              ) : <span />}
              <Btn variant="primary" onClick={savePhase}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL TIMER ==================== */}
      <Modal open={Boolean(editTimer)} onClose={() => setEditTimer(null)} title={editTimer?.id ? "Modifier le cycle" : "Nouveau cycle"}>
        {editTimer && (
          <div className="space-y-3.5">
            <Field label="Nom"><Input value={editTimer.name ?? ""} onChange={(e) => setEditTimer({ ...editTimer, name: e.target.value })} placeholder="Ex : Changer les draps" /></Field>
            <Field label="Description"><Textarea rows={2} value={editTimer.description ?? ""} onChange={(e) => setEditTimer({ ...editTimer, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fréquence (jours)"><Input type="number" min={1} value={editTimer.frequencyDays ?? ""} onChange={(e) => setEditTimer({ ...editTimer, frequencyDays: Number(e.target.value) })} /></Field>
              <Field label="Catégorie">
                <Select value={editTimer.category} onChange={(e) => setEditTimer({ ...editTimer, category: e.target.value })}>
                  {Object.entries(TIMER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Dernière exécution"><Input type="date" value={editTimer.lastDone ?? todayKey()} onChange={(e) => setEditTimer({ ...editTimer, lastDone: e.target.value })} /></Field>
            <Field label="Icône"><IconPicker value={editTimer.icon ?? undefined} onChange={(v) => setEditTimer({ ...editTimer, icon: v })} /></Field>
            <div className="flex items-center justify-between pt-3 border-t border-line">
              {editTimer.id ? (
                <Btn variant="danger" small onClick={() => { const id = editTimer.id!; const name = editTimer.name; setEditTimer(null); setConfirm({ label: `Supprimer le cycle « ${name} » ?`, action: async () => { await apiFetch(`/api/timers/${id}`, { method: "DELETE" }); await load(); flash("Cycle supprimé."); } }); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </Btn>
              ) : <span />}
              <Btn variant="primary" onClick={saveTimer}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== CONFIRMATION ==================== */}
      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Confirmation requise">
        <p className="text-[12.5px] text-dust leading-relaxed mb-5">{confirm?.label}</p>
        <div className="flex justify-end gap-2">
          <Btn onClick={() => setConfirm(null)}>Annuler</Btn>
          <Btn variant="danger" onClick={async () => { const c = confirm; setConfirm(null); await c?.action(); }}>Confirmer</Btn>
        </div>
      </Modal>
    </ScreenFrame>
  );
}
