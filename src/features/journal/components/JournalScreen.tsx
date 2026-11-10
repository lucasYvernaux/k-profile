"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { ArrowDownBox as Download, Plus, Search, Trash as Trash2, ChevronLeft, ChevronRight } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Field, Input, Select, Textarea, Slider, Modal, EmptyState } from "@/shared/ui/primitives";
import { Bars } from "@/shared/ui/charts";
import { EMOTIONS, INTERDITS, PIEGES } from "@/shared/domain/constants";
import { addDays, formatKeyFr, todayKey } from "@/shared/lib/dates";
import { parseJson, type EmotionLogRow, type JournalRow } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

type Tab = "today" | "emotions" | "history";

export default function JournalPage() {
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(todayKey());
  const [journal, setJournal] = useState<JournalRow | null>(null);
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [emotions, setEmotions] = useState<EmotionLogRow[]>([]);
  const [emoOpen, setEmoOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [j, list, emo] = await Promise.all([
      apiFetch(`/api/logbook?date=${date}`, { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/logbook", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/emotions", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setJournal(j);
    setJournals(list);
    setEmotions(emo);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function save(patch: Record<string, unknown>) {
    const merged = { ...(journal ?? { date }), ...patch, date };
    await apiFetch("/api/logbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(merged) });
    setJournal(merged as JournalRow);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return journals;
    const q = search.toLowerCase();
    return journals.filter((j) =>
      [j.wins, j.losses, j.improvements, j.notes, j.distractions, j.emotionsNote].some((f) => f?.toLowerCase().includes(q))
    );
  }, [journals, search]);

  const emoStats = useMemo(() => {
    const byEmotion = new Map<string, number>();
    const byHour = new Array<number>(24).fill(0);
    const triggers = new Map<string, number>();
    for (const e of emotions) {
      byEmotion.set(e.emotion, (byEmotion.get(e.emotion) ?? 0) + 1);
      byHour[e.hour] = (byHour[e.hour] ?? 0) + 1;
      const t = e.triggerText?.trim().toLowerCase();
      if (t) triggers.set(t, (triggers.get(t) ?? 0) + 1);
    }
    const peakHour = byHour.indexOf(Math.max(...byHour));
    return {
      byEmotion: [...byEmotion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      peakHour: emotions.length > 0 ? peakHour : null,
      triggers: [...triggers.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n > 1).slice(0, 6),
    };
  }, [emotions]);

  function exportMarkdown(entries: JournalRow[]) {
    const md = ["# Livre des Ombres — Export", ""];
    for (const j of entries) {
      md.push(`## ${formatKeyFr(j.date)}`);
      md.push(`**Humeur** ${j.mood ?? "-"}/10 · **Énergie** ${j.energy ?? "-"}/10 · **Focus** ${j.focus ?? "-"}/10`);
      if (j.wins) md.push(`\n**Ce que j'ai fait de bien**\n${j.wins}`);
      if (j.losses) md.push(`\n**Où j'ai perdu le contrôle**\n${j.losses}`);
      if (j.distractions) md.push(`\n**Distractions**\n${j.distractions}`);
      if (j.emotionsNote) md.push(`\n**Émotion dominante**\n${j.emotionsNote}`);
      if (j.improvements) md.push(`\n**Améliorations pour demain**\n${j.improvements}`);
      if (j.notes) md.push(`\n**Notes**\n${j.notes}`);
      md.push("\n---\n");
    }
    const blob = new Blob([md.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `livre-des-ombres-${todayKey()}.md`;
    a.click();
  }

  const violated = parseJson<string[]>(journal?.violatedRules, []);
  const traps = parseJson<string[]>(journal?.trapsHit, []);

  return (
    <ScreenFrame title="Livre des Ombres">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Livre des Ombres — Journal & Réflexion</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash capitalize">{formatKeyFr(date)}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-raise/60 border border-line rounded-lg p-0.5">
            {([["today", "Journal"], ["emotions", "Émotions"], ["history", "Historique"]] as [Tab, string][]).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} className={`text-[11px] px-3 py-1.5 rounded-md transition-all ${tab === t ? "bg-ember text-black font-semibold" : "text-dust hover:text-ash"}`}>{l}</button>
            ))}
          </div>
          <Btn variant="outline" small onClick={() => setEmoOpen(true)}><Plus className="w-3.5 h-3.5" /> Logger une émotion</Btn>
        </div>
      </div>

      {tab === "today" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-4" hairline>
            <SectionTitle icon="gauge" title="État intérieur" sub="Sliders 1–10" right={
              <div className="flex gap-1">
                <button onClick={() => setDate(addDays(date, -1))} aria-label="Jour précédent" className="p-1.5 rounded-lg text-smoke hover:text-ash border border-line"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {date !== todayKey() && <button onClick={() => setDate(todayKey())} className="text-[10px] px-2 rounded-lg text-dust hover:text-ash border border-line">Aujourd'hui</button>}
                <button onClick={() => setDate(addDays(date, 1))} aria-label="Jour suivant" className="p-1.5 rounded-lg text-smoke hover:text-ash border border-line"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            } />
            <div className="space-y-5">
              <Slider label="Humeur du jour" value={journal?.mood ?? 5} onChange={(v) => save({ mood: v })} />
              <Slider label="Énergie physique" value={journal?.energy ?? 5} onChange={(v) => save({ energy: v })} />
              <Slider label="Focus mental" value={journal?.focus ?? 5} onChange={(v) => save({ focus: v })} />
            </div>
            <div className="mt-5 pt-4 border-t border-line">
              <p className="text-[10px] uppercase tracking-[0.18em] text-smoke mb-2">Interdits violés</p>
              <div className="flex flex-wrap gap-1.5">
                {INTERDITS.map((it) => (
                  <button key={it} onClick={() => save({ violatedRules: violated.includes(it) ? violated.filter((x) => x !== it) : [...violated, it] })}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${violated.includes(it) ? "border-blood/50 text-blood bg-blood/10" : "border-line text-smoke hover:text-dust"}`}>
                    {it}
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-smoke mb-2 mt-4">Pièges frôlés</p>
              <div className="flex flex-wrap gap-1.5">
                {PIEGES.map((p) => (
                  <button key={p} onClick={() => save({ trapsHit: traps.includes(p) ? traps.filter((x) => x !== p) : [...traps, p] })}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${traps.includes(p) ? "border-ember/50 text-ember bg-ember/10" : "border-line text-smoke hover:text-dust"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {saved && <p className="text-jade text-[10px] mt-4 flex items-center gap-1"><Save className="w-3 h-3" /> Sauvegardé automatiquement</p>}
          </Card>

          <Card className="lg:col-span-8">
            <SectionTitle icon="notebook-pen" title="Analyse du jour" sub="Le Gouvernement de l'Ombre en action" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Qu'ai-je fait de bien aujourd'hui ?"><Textarea rows={3} defaultValue={journal?.wins ?? ""} key={`w-${date}${journal?.id ?? 0}`} onBlur={(e) => save({ wins: e.target.value })} /></Field>
              <Field label="Où ai-je perdu le contrôle ?"><Textarea rows={3} defaultValue={journal?.losses ?? ""} key={`l-${date}${journal?.id ?? 0}`} onBlur={(e) => save({ losses: e.target.value })} /></Field>
              <Field label="Qu'est-ce qui m'a distrait ?"><Textarea rows={2} defaultValue={journal?.distractions ?? ""} key={`d-${date}${journal?.id ?? 0}`} onBlur={(e) => save({ distractions: e.target.value })} /></Field>
              <Field label="Quelle émotion a influencé mes décisions ?"><Textarea rows={2} defaultValue={journal?.emotionsNote ?? ""} key={`e-${date}${journal?.id ?? 0}`} onBlur={(e) => save({ emotionsNote: e.target.value })} /></Field>
              <Field label="Qu'est-ce que je peux améliorer demain ?"><Textarea rows={2} defaultValue={journal?.improvements ?? ""} key={`i-${date}${journal?.id ?? 0}`} onBlur={(e) => save({ improvements: e.target.value })} /></Field>
              <Field label="Notes libres (markdown accepté)"><Textarea rows={2} defaultValue={journal?.notes ?? ""} key={`n-${date}${journal?.id ?? 0}`} onBlur={(e) => save({ notes: e.target.value })} placeholder="**Gras**, listes, pensées brutes…" /></Field>
            </div>
          </Card>
        </motion.div>
      )}

      {tab === "emotions" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-5" hairline>
            <SectionTitle icon="eye" title="Patterns émotionnels" sub={`${emotions.length} émotions loggées`} />
            {emotions.length === 0 ? (
              <EmptyState icon="wind" title="Aucune émotion loggée." sub="Le Gouvernement de l'Ombre commence par l'observation." />
            ) : (
              <>
                <Bars data={emoStats.byEmotion.map(([label, value]) => ({ label, value, color: "#8b8cf8" }))} />
                <div className="mt-4 pt-4 border-t border-line space-y-2 text-[11px] text-dust">
                  {emoStats.peakHour !== null && <p>◆ Heure critique : vers <span className="text-ember font-semibold">{emoStats.peakHour}h</span> — moment où les émotions affleurent le plus.</p>}
                  {emoStats.triggers.length > 0 && (
                    <p>◆ Déclencheurs récurrents : {emoStats.triggers.map(([t, n]) => <span key={t} className="inline-block text-blood/90 border border-blood/30 rounded px-1.5 py-0.5 text-[10px] mr-1 mb-1">{t} ×{n}</span>)}</p>
                  )}
                </div>
              </>
            )}
          </Card>
          <Card className="lg:col-span-7">
            <SectionTitle icon="list" title="Registre des émotions" right={<Btn variant="outline" small onClick={() => setEmoOpen(true)}><Plus className="w-3.5 h-3.5" /> Logger</Btn>} />
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {emotions.map((e) => (
                <div key={e.id} className="bg-raise/40 border border-line rounded-lg p-3 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-ash">{e.emotion}</span>
                      <span className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <span key={i} className={`w-1 h-2.5 rounded-sm ${i < e.intensity ? "bg-gradient-to-t from-ember to-blood" : "bg-line"}`} />
                        ))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-smoke">{e.date} · {e.hour}h</span>
                      <button onClick={async () => { await apiFetch(`/api/emotions?id=${e.id}`, { method: "DELETE" }); load(); }} aria-label={`Supprimer l'émotion « ${e.emotion} »`} className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 p-1 text-smoke hover:text-blood transition-all"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {e.triggerText && <p className="text-[11px] text-dust mt-1.5"><span className="text-smoke">Déclencheur :</span> {e.triggerText}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                    {e.reaction && <p className="text-[10.5px] text-blood/80"><span className="text-smoke">Réaction :</span> {e.reaction}</p>}
                    {e.idealReaction && <p className="text-[10.5px] text-jade/80"><span className="text-smoke">Réaction idéale :</span> {e.idealReaction}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {tab === "history" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card hairline>
            <SectionTitle
              icon="archive"
              title="Archives du Livre"
              sub={`${filtered.length} entrée(s)`}
              right={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-smoke" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche full-text…"
                      className="bg-inset border border-border rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-ash focus:outline-none focus:border-ember w-48" />
                  </div>
                  <Btn small variant="outline" onClick={() => exportMarkdown(filtered)}><Download className="w-3.5 h-3.5" /> Markdown</Btn>
                </div>
              }
            />
            {filtered.length === 0 ? (
              <EmptyState icon="book-open" title="Le Livre est encore vierge." sub="Chaque soir, une page s'écrit. La première commence ce soir." />
            ) : (
              <div className="space-y-2">
                {filtered.map((j) => {
                  const open = expanded === j.date;
                  return (
                    <div key={j.date} className="bg-raise/30 border border-line rounded-xl overflow-hidden">
                      <button onClick={() => setExpanded(open ? null : j.date)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-raise/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="font-display text-lg font-bold text-flame leading-none">{j.date.slice(8)}</p>
                            <p className="text-[8px] uppercase tracking-widest text-smoke">{j.date.slice(5, 7)}/{j.date.slice(0, 4)}</p>
                          </div>
                          <div className="h-8 w-px bg-line" />
                          <p className="text-[12px] text-dust capitalize">{formatKeyFr(j.date)}</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          {j.mood && <span className="text-dust">Humeur <span className="text-flame font-semibold">{j.mood}</span></span>}
                          {j.energy && <span className="text-dust hidden sm:inline">Énergie <span className="text-flame font-semibold">{j.energy}</span></span>}
                          {j.focus && <span className="text-dust hidden sm:inline">Focus <span className="text-flame font-semibold">{j.focus}</span></span>}
                          <Btn small onClick={() => { setDate(j.date); setTab("today"); }}>Ouvrir</Btn>
                        </div>
                      </button>
                      {open && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-line pt-3">
                          {j.wins && <div><p className="text-[9px] uppercase tracking-widest text-jade mb-1">Victoires</p><p className="text-[11.5px] text-dust whitespace-pre-wrap">{j.wins}</p></div>}
                          {j.losses && <div><p className="text-[9px] uppercase tracking-widest text-blood mb-1">Pertes de contrôle</p><p className="text-[11.5px] text-dust whitespace-pre-wrap">{j.losses}</p></div>}
                          {j.improvements && <div><p className="text-[9px] uppercase tracking-widest text-ember mb-1">Améliorations</p><p className="text-[11.5px] text-dust whitespace-pre-wrap">{j.improvements}</p></div>}
                          {j.notes && <div className="sm:col-span-2"><p className="text-[9px] uppercase tracking-widest text-smoke mb-1">Notes</p><p className="text-[11.5px] text-dust whitespace-pre-wrap">{j.notes}</p></div>}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* ========== MODAL ÉMOTION ========== */}
      <EmotionModal open={emoOpen} onClose={() => setEmoOpen(false)} onSaved={() => { setEmoOpen(false); load(); }} />
    </ScreenFrame>
  );
}

function EmotionModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ emotion: "Colère", intensity: 5, triggerText: "", reaction: "", idealReaction: "" });
  async function save() {
    await apiFetch("/api/emotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    onSaved();
  }
  return (
    <Modal open={open} onClose={onClose} title="Logger une émotion">
      <div className="space-y-3.5">
        <Field label="Émotion">
          <Select value={form.emotion} onChange={(e) => setForm({ ...form, emotion: e.target.value })}>
            {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
        </Field>
        <Slider label="Intensité" value={form.intensity} onChange={(v) => setForm({ ...form, intensity: v })} />
        <Field label="Déclencheur"><Input value={form.triggerText} onChange={(e) => setForm({ ...form, triggerText: e.target.value })} placeholder="Qu'est-ce qui a déclenché cette émotion ?" /></Field>
        <Field label="Réaction (ce que j'ai fait)"><Textarea rows={2} value={form.reaction} onChange={(e) => setForm({ ...form, reaction: e.target.value })} /></Field>
        <Field label="Réaction idéale (ce que l'Architecte aurait fait)"><Textarea rows={2} value={form.idealReaction} onChange={(e) => setForm({ ...form, idealReaction: e.target.value })} /></Field>
        <div className="flex justify-end pt-2"><Btn variant="primary" onClick={save}>Sceller</Btn></div>
      </div>
    </Modal>
  );
}
