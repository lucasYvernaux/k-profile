"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Plus, Pen as Pencil, Trash as Trash2 } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, Field, Input, Select, Textarea, EmptyState } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import { TIMER_CATEGORIES } from "@/shared/domain/constants";
import { addDays, formatKeyFr, monthNameFr, todayKey } from "@/shared/lib/dates";
import type { TimerRow } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

type View = "all" | "today" | "week" | "calendar";

const STATUS_UI = {
  late: { label: "EN RETARD", color: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.35)" },
  soon: { label: "BIENTÔT", color: "#d4af37", bg: "rgba(212,175,55,0.07)", border: "rgba(212,175,55,0.35)" },
  ok: { label: "OK", color: "#10b981", bg: "rgba(16,185,129,0.05)", border: "rgba(16,185,129,0.25)" },
};

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(`${target}T23:59:59`).getTime();
  const ms = end - now;
  if (ms <= 0) return <span className="text-blood font-semibold">{Math.abs(Math.round(ms / 86400000))} j de retard</span>;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return <span>{d > 0 ? `${d}j ` : ""}{h}h</span>;
}

export default function TimersPage() {
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [history, setHistory] = useState<{ id: number; timerId: number; completedAt: string }[]>([]);
  const [view, setView] = useState<View>("all");
  const [edit, setEdit] = useState<Partial<TimerRow> | null>(null);
  const [month, setMonth] = useState(todayKey().slice(0, 7));

  const load = useCallback(async () => {
    await apiFetch("/api/bootstrap", { method: "POST" });
    const res = await apiFetch("/api/timers", { cache: "no-store" });
    const data = await res.json();
    setTimers(data.timers);
    setHistory(data.history);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markDone(id: number) {
    await apiFetch(`/api/timers/${id}/done`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    load();
  }
  async function save() {
    if (!edit?.name || !edit.frequencyDays) return;
    if (edit.id) {
      await apiFetch(`/api/timers/${edit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
    } else {
      await apiFetch("/api/timers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
    }
    setEdit(null);
    load();
  }
  async function remove(id: number) {
    await apiFetch(`/api/timers/${id}`, { method: "DELETE" });
    setEdit(null);
    load();
  }

  const active = timers.filter((t) => t.isActive);
  const late = active.filter((t) => t.status === "late");
  const soon = active.filter((t) => t.status === "soon");
  const dueToday = active.filter((t) => t.remaining <= 0);
  const dueWeek = active.filter((t) => t.remaining <= 7);
  const visible = view === "today" ? dueToday : view === "week" ? dueWeek : active;

  const grouped = useMemo(() => {
    const g = new Map<string, TimerRow[]>();
    for (const t of visible) {
      const arr = g.get(t.category) ?? [];
      arr.push(t);
      g.set(t.category, arr);
    }
    return [...g.entries()];
  }, [visible]);

  // Projection calendrier du mois
  const projections = useMemo(() => {
    const map = new Map<string, TimerRow[]>();
    const [y, m] = month.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    for (const t of active) {
      if (!t.nextDue) continue;
      let cursor = t.nextDue;
      let guard = 0;
      while (guard++ < 60) {
        if (cursor.slice(0, 7) === month) {
          const arr = map.get(cursor) ?? [];
          arr.push(t);
          map.set(cursor, arr);
        } else if (cursor.slice(0, 7) > month) break;
        cursor = addDays(cursor, t.frequencyDays);
        if (cursor > `${month}-${String(dim).padStart(2, "0")}`) {
          if (guard > 2) {
            const over = guard;
            void over;
          }
        }
      }
    }
    return map;
  }, [active, month]);

  const [selDay, setSelDay] = useState<string | null>(null);

  function TimerCard({ t }: { t: TimerRow }) {
    const ui = STATUS_UI[t.status];
    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border p-4" style={{ background: ui.bg, borderColor: `${ui.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0" style={{ borderColor: ui.border, color: ui.color }}>
              <DynIcon name={t.icon} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ash leading-snug">{t.name}</p>
              <p className="text-[10px] text-smoke mt-0.5">{TIMER_CATEGORIES[t.category] ?? t.category} · tous les {t.frequencyDays} j</p>
              {t.description && <p className="text-[10px] text-smoke mt-0.5 italic">{t.description}</p>}
            </div>
          </div>
          <span className="text-[8.5px] font-bold tracking-[0.14em] px-1.5 py-0.5 rounded shrink-0" style={{ color: ui.color, border: `1px solid ${ui.border}` }}>{ui.label}</span>
        </div>
        <div className="mt-3 h-1.5 bg-black/30 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ((t.frequencyDays - Math.max(0, t.remaining)) / t.frequencyDays) * 100)}%`, background: ui.color, boxShadow: `0 0 6px ${ui.color}88` }} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-[10px] text-smoke">
            {t.lastDone ? `Dernier : ${formatKeyFr(t.lastDone)}` : "Jamais fait"}
            {t.nextDue && <span className="block text-dust mt-0.5 font-display text-[12px]" style={{ fontFamily: "var(--font-mono-family)" }}><Countdown target={t.nextDue} /></span>}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setEdit(t)} aria-label={`Modifier « ${t.name} »`} className="p-1.5 rounded-lg text-smoke hover:text-dust border border-transparent hover:border-line transition-all">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <Btn variant="success" small onClick={() => markDone(t.id)}>
              <Check className="w-3.5 h-3.5" /> Fait
            </Btn>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <ScreenFrame title="Tour de Contrôle">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Tour de Contrôle — Cycles de vie</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">
            {late.length > 0 ? <span className="text-blood">{late.length} en retard</span> : <span className="text-jade">Tout est sous contrôle</span>}
            {soon.length > 0 && <span className="text-ember text-lg ml-3">· {soon.length} bientôt dus</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex bg-raise/60 border border-line rounded-lg p-0.5 overflow-x-auto max-w-full">
            {([["all", "Tous"], ["today", "Aujourd'hui"], ["week", "Cette semaine"], ["calendar", "Calendrier"]] as [View, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} className={`text-[11px] px-2.5 sm:px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${view === v ? "bg-ember text-black font-semibold" : "text-dust hover:text-ash"}`}>{l}</button>
            ))}
          </div>
          <Btn variant="primary" small onClick={() => setEdit({ category: "menage", frequencyDays: 7, icon: "timer" })}>
            <Plus className="w-3.5 h-3.5" /> Nouveau cycle
          </Btn>
        </div>
      </div>

      {view !== "calendar" ? (
        grouped.length === 0 ? (
          <Card><EmptyState icon="radar" title="Aucun cycle dans cette vue." sub="La Tour de Contrôle est silencieuse. Tout est à jour." /></Card>
        ) : (
          <div className="space-y-5">
            {grouped.map(([cat, list]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-smoke">{TIMER_CATEGORIES[cat] ?? cat}</span>
                  <span className="flex-1 h-px bg-line" />
                  <span className="text-[10px] text-smoke">{list.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map((t) => <TimerCard key={t.id} t={t} />)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card hairline>
            <SectionTitle
              icon="calendar-days"
              title={monthNameFr(month)}
              sub="Projection des cycles futurs"
              right={
                <div className="flex gap-1">
                  <button onClick={() => setMonth(addDays(`${month}-01`, -31).slice(0, 7))} aria-label="Mois précédent" className="p-1.5 rounded-lg text-smoke hover:text-ash border border-line"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setMonth(addDays(`${month}-01`, 31).slice(0, 7))} aria-label="Mois suivant" className="p-1.5 rounded-lg text-smoke hover:text-ash border border-line"><ChevronRight className="w-4 h-4" /></button>
                </div>
              }
            />
            {(() => {
              const [y, m] = month.split("-").map(Number);
              const dim = new Date(y, m, 0).getDate();
              const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
              const cells = [...Array.from({ length: firstDow }, () => null), ...Array.from({ length: dim }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
              return (
                <div>
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i} className="text-center text-[9px] text-smoke font-semibold">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((key, i) => {
                      if (!key) return <div key={i} />;
                      const list = projections.get(key) ?? [];
                      const overdue = key < todayKey() && list.length > 0;
                      return (
                        <button
                          key={i}
                          onClick={() => list.length && setSelDay(key)}
                          className={`aspect-square rounded-md flex flex-col items-center justify-center transition-all ${selDay === key ? "ring-2 ring-ember" : ""} ${list.length ? "cursor-pointer" : "cursor-default"}`}
                          style={{ background: list.length ? (overdue ? "rgba(239,68,68,0.25)" : "rgba(212,175,55,0.18)") : "#141414" }}
                        >
                          <span className={`text-[10px] font-semibold ${list.length ? "text-ember" : "text-smoke"}`}>{Number(key.slice(8))}</span>
                          {list.length > 0 && <span className="text-[8px] text-ember">{list.length} cycle{list.length > 1 ? "s" : ""}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Card>
          <Card>
            <SectionTitle icon="list" title={selDay ? formatKeyFr(selDay) : "Détail du jour"} />
            {selDay && (projections.get(selDay)?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {projections.get(selDay)!.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-raise/40 border border-line rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <DynIcon name={t.icon} className="w-4 h-4 text-ember" />
                      <div>
                        <p className="text-[12px] text-ash">{t.name}</p>
                        <p className="text-[10px] text-smoke">{TIMER_CATEGORIES[t.category] ?? t.category}</p>
                      </div>
                    </div>
                    <Btn variant="success" small onClick={() => markDone(t.id)}><Check className="w-3.5 h-3.5" /> Fait</Btn>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="calendar" title="Sélectionne un jour avec cycles projetés." />
            )}
            <div className="mt-5 pt-4 border-t border-line">
              <p className="text-[10px] uppercase tracking-[0.18em] text-smoke mb-2">Dernières exécutions</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {history.slice(0, 12).map((h) => {
                  const t = timers.find((x) => x.id === h.timerId);
                  return (
                    <div key={h.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-dust">{t?.name ?? `Cycle #${h.timerId}`}</span>
                      <span className="text-smoke">{formatKeyFr(h.completedAt)}</span>
                    </div>
                  );
                })}
                {history.length === 0 && <p className="text-[11px] text-smoke">Aucune exécution enregistrée pour l'instant.</p>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========== MODAL ========== */}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Modifier le cycle" : "Nouveau cycle"}>
        {edit && (
          <div className="space-y-3.5">
            <Field label="Nom"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Ex : Changer les draps" /></Field>
            <Field label="Description (optionnel)"><Textarea rows={2} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fréquence (jours)">
                <Input type="number" min={1} value={edit.frequencyDays ?? ""} onChange={(e) => setEdit({ ...edit, frequencyDays: Number(e.target.value) })} />
              </Field>
              <Field label="Catégorie">
                <Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                  {Object.entries(TIMER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
            </div>
            {edit.id && (
              <Field label="Dernière exécution">
                <Input type="date" value={edit.lastDone ?? ""} onChange={(e) => setEdit({ ...edit, lastDone: e.target.value })} />
              </Field>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-line">
              {edit.id ? <Btn variant="danger" small onClick={() => remove(edit.id!)}><Trash2 className="w-3.5 h-3.5" /> Supprimer</Btn> : <span />}
              <Btn variant="primary" onClick={save}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>
    </ScreenFrame>
  );
}
