"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, CircleDot } from "lucide-react";
import { Check, Plus, Trash as Trash2, Pen as Pencil } from "@getpapillon/papicons";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, Field, Input, Select, Textarea, EmptyState, ProgressBar } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import { GOAL_LEVELS, PILLARS, PILLAR_MAP } from "@/shared/domain/constants";
import { formatKeyFr, todayKey } from "@/shared/lib/dates";
import { parseJson, type GoalRow, type ProjectRow, type SkillRow } from "@/shared/types";
import { apiFetch } from "@/shared/lib/api-client";

type Tab = "goals" | "projects" | "skills";
type Sub = { id: string; title: string; done: boolean };
type Milestone = { id: string; title: string; date: string; done: boolean };
type PJournal = { date: string; text: string };

const SKILL_LEVELS = [
  { key: "debutant", label: "Débutant" }, { key: "intermediaire", label: "Intermédiaire" }, { key: "avance", label: "Avancé" },
  { key: "expert", label: "Expert" }, { key: "maitre", label: "Maître" },
];

export default function GoalsPage() {
  const [tab, setTab] = useState<Tab>("goals");
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [editGoal, setEditGoal] = useState<Partial<GoalRow> | null>(null);
  const [editProject, setEditProject] = useState<Partial<ProjectRow> | null>(null);
  const [editSkill, setEditSkill] = useState<Partial<SkillRow> | null>(null);
  const [openProject, setOpenProject] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");

  const load = useCallback(async () => {
    const [g, p, s] = await Promise.all([
      apiFetch("/api/goals", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
      apiFetch("/api/skills", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setGoals(g); setProjects(p); setSkills(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------- goals ---------- */
  async function saveGoal() {
    if (!editGoal?.title) return;
    if (editGoal.id) await apiFetch(`/api/goals/${editGoal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editGoal) });
    else await apiFetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editGoal) });
    setEditGoal(null); load();
  }
  async function patchGoal(id: number, patch: Record<string, unknown>) {
    await apiFetch(`/api/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    load();
  }

  /* ---------- projects ---------- */
  async function saveProject() {
    if (!editProject?.name) return;
    if (editProject.id) await apiFetch(`/api/projects/${editProject.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editProject) });
    else await apiFetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editProject) });
    setEditProject(null); load();
  }
  async function patchProject(id: number, patch: Record<string, unknown>) {
    await apiFetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    load();
  }

  /* ---------- skills ---------- */
  async function saveSkill() {
    if (!editSkill?.name) return;
    if (editSkill.id) {
      await apiFetch("/api/skills", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editSkill) });
    } else {
      await apiFetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editSkill) });
    }
    setEditSkill(null); load();
  }

  return (
    <ScreenFrame title="Carte de Conquête">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Carte de Conquête — Objectifs & Projets</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">
            {goals.filter((g) => g.status === "completed").length}/{goals.length} buts conquis · {projects.filter((p) => p.status === "active").length} projet(s) phare(s) actif(s)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-raise/60 border border-line rounded-lg p-0.5">
            {([["goals", "Buts"], ["projects", "Projets phares"], ["skills", "Compétences"]] as [Tab, string][]).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} className={`text-[11px] px-3 py-1.5 rounded-md transition-all ${tab === t ? "bg-ember text-black font-semibold" : "text-dust hover:text-ash"}`}>{l}</button>
            ))}
          </div>
          <Btn variant="primary" small onClick={() => {
            if (tab === "goals") setEditGoal({ level: 1, pillar: "forge", status: "active", subGoals: "[]" });
            else if (tab === "projects") setEditProject({ pillar: "artisanat", status: "active", startDate: todayKey() });
            else setEditSkill({ category: "mentale", level: "debutant" });
          }}>
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Btn>
        </div>
      </div>

      {/* ================= GOALS ================= */}
      {tab === "goals" && (
        <div className="space-y-5">
          {GOAL_LEVELS.map((lvl, li) => {
            const list = goals.filter((g) => g.level === lvl.level);
            return (
              <motion.div key={lvl.level} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.06 }}>
                <Card hairline={li === 0}>
                  <SectionTitle icon="layers" title={`Niveau ${lvl.level} — ${lvl.name}`} sub={lvl.desc} right={<span className="text-[10px] text-smoke">{list.filter((g) => g.status === "completed").length}/{list.length}</span>} />
                  {list.length === 0 ? (
                    <p className="text-[11px] text-smoke italic">Aucun but défini à ce niveau de la hiérarchie.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {list.map((g) => {
                        const subs = parseJson<Sub[]>(g.subGoals, []);
                        const doneSubs = subs.filter((s) => s.done).length;
                        const completion = subs.length ? Math.round((doneSubs / subs.length) * 100) : g.completion;
                        return (
                          <div key={g.id} className={`rounded-xl border p-4 transition-all ${g.status === "completed" ? "border-jade/30 bg-jade/[0.03]" : "border-line bg-raise/30"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-[13.5px] font-semibold ${g.status === "completed" ? "text-jade line-through" : "text-ash"}`}>{g.title}</p>
                                  {g.pillar && <span className="text-[8.5px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${PILLAR_MAP[g.pillar]?.color}55`, color: PILLAR_MAP[g.pillar]?.color }}>{PILLAR_MAP[g.pillar]?.short}</span>}
                                  {g.status !== "active" && g.status !== "completed" && <span className="text-[8.5px] px-1.5 py-0.5 rounded border border-smoke/40 text-smoke uppercase">{g.status === "paused" ? "pause" : "abandonné"}</span>}
                                </div>
                                {g.description && <p className="text-[11px] text-smoke mt-1">{g.description}</p>}
                                {g.deadline && <p className="text-[10px] text-ember mt-1">Échéance : {formatKeyFr(g.deadline)}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setEditGoal({ ...g })} className="p-1.5 rounded-lg text-smoke hover:text-dust"><Pencil className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            {subs.length > 0 && (
                              <div className="mt-3 space-y-1.5">
                                {subs.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => {
                                      const next = subs.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x));
                                      patchGoal(g.id, { subGoals: next, completion: Math.round((next.filter((x) => x.done).length / next.length) * 100) });
                                    }}
                                    className="flex items-center gap-2.5 w-full text-left group"
                                  >
                                    <span className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 transition-all ${s.done ? "bg-gradient-to-br from-ember to-[#d97706] border-ember" : "border-line2 group-hover:border-ember/60"}`}>
                                      <Check className={`w-2.5 h-2.5 ${s.done ? "text-black" : "text-transparent"}`} strokeWidth={3} />
                                    </span>
                                    <span className={`text-[11.5px] ${s.done ? "text-smoke line-through" : "text-dust"}`}>{s.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-3">
                              <ProgressBar value={completion} className="flex-1" />
                              <span className="text-[10px] font-semibold text-flame">{completion}%</span>
                              {g.status === "active" && completion >= 100 && (
                                <button onClick={() => patchGoal(g.id, { status: "completed" })} className="text-[9px] px-2 py-1 rounded-lg border border-jade/40 text-jade hover:bg-jade/10 transition-all flex items-center gap-1">
                                  <Flag className="w-3 h-3" /> Conquérir
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= PROJECTS ================= */}
      {tab === "projects" && (
        <div className="space-y-4">
          {projects.length === 0 && <Card><EmptyState icon="map" title="Aucun projet phare." sub="Chaque trimestre, un projet qui change la trajectoire." /></Card>}
          {projects.map((p, i) => {
            const milestones = parseJson<Milestone[]>(p.milestones, []);
            const journal = parseJson<PJournal[]>(p.journal, []);
            const open = openProject === p.id;
            const completion = milestones.length ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100) : p.completion;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Card hairline={i === 0}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${p.status === "completed" ? "border-jade/40 bg-jade/10" : "border-ember/30 bg-ember/10"}`}>
                        <DynIcon name={p.status === "completed" ? "trophy" : "swords"} className={`w-5 h-5 ${p.status === "completed" ? "text-jade" : "text-flame"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display text-[15px] font-bold text-ash">{p.name}</p>
                          {p.pillar && <span className="text-[8.5px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${PILLAR_MAP[p.pillar]?.color}55`, color: PILLAR_MAP[p.pillar]?.color }}>{PILLAR_MAP[p.pillar]?.short}</span>}
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${p.status === "completed" ? "border-jade/40 text-jade" : p.status === "active" ? "border-ember/40 text-ember" : "border-smoke/40 text-smoke"}`}>{p.status === "completed" ? "Accompli" : p.status}</span>
                        </div>
                        {p.description && <p className="text-[11px] text-smoke mt-1">{p.description}</p>}
                        <p className="text-[10px] text-smoke mt-1">{p.startDate ? formatKeyFr(p.startDate) : ""} {p.endDate ? `→ ${formatKeyFr(p.endDate)}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditProject({ ...p })} className="p-1.5 rounded-lg text-smoke hover:text-dust"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setOpenProject(open ? null : p.id)} className={`p-1.5 rounded-lg transition-colors ${open ? "text-ember" : "text-smoke hover:text-dust"}`}><CircleDot className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={completion} className="flex-1" color={p.status === "completed" ? "#10b981" : "#f59e0b"} />
                    <span className="text-[11px] font-bold text-flame">{completion}%</span>
                  </div>
                  {open && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-line grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-smoke">Milestones</p>
                          <button
                            onClick={() => patchProject(p.id, { milestones: [...milestones, { id: crypto.randomUUID(), title: "Nouveau milestone", date: todayKey(), done: false }] })}
                            className="text-[10px] text-ember hover:text-flame flex items-center gap-1"
                          ><Plus className="w-3 h-3" /> Ajouter</button>
                        </div>
                        <div className="space-y-1.5">
                          {milestones.map((m) => (
                            <div key={m.id} className="flex items-center gap-2.5 group">
                              <button onClick={() => patchProject(p.id, { milestones: milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) })}
                                aria-pressed={m.done}
                                aria-label={`Jalon « ${m.title} » atteint`}
                                className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 transition-all ${m.done ? "bg-gradient-to-br from-ember to-[#d97706] border-ember" : "border-line2 hover:border-ember/60"}`}>
                                <Check className={`w-2.5 h-2.5 ${m.done ? "text-black" : "text-transparent"}`} strokeWidth={3} />
                              </button>
                              <input
                                aria-label="Titre du jalon"
                                defaultValue={m.title}
                                onBlur={(e) => e.target.value !== m.title && patchProject(p.id, { milestones: milestones.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)) })}
                                className={`flex-1 bg-transparent text-[11.5px] focus:outline-none border-b border-transparent focus:border-ember/40 ${m.done ? "text-smoke line-through" : "text-dust"}`}
                              />
                              <span className="text-[9.5px] text-smoke">{m.date}</span>
                              <button onClick={() => patchProject(p.id, { milestones: milestones.filter((x) => x.id !== m.id) })} aria-label={`Supprimer le jalon « ${m.title} »`} className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 text-smoke hover:text-blood transition-all"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                          {milestones.length === 0 && <p className="text-[10.5px] text-smoke italic">Aucun milestone — découpe la conquête en étapes.</p>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-smoke mb-2">Journal de projet</p>
                        <div className="flex gap-2 mb-2">
                          <Input value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder="Entrée datée d'aujourd'hui…" className="flex-1" />
                          <Btn small variant="primary" onClick={() => {
                            if (!journalText.trim()) return;
                            patchProject(p.id, { journal: [{ date: todayKey(), text: journalText.trim() }, ...journal] });
                            setJournalText("");
                          }}><Plus className="w-3.5 h-3.5" /></Btn>
                        </div>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {journal.map((j, idx) => (
                            <div key={idx} className="bg-raise/40 border border-line rounded-lg px-3 py-2">
                              <p className="text-[9px] text-ember">{j.date}</p>
                              <p className="text-[11.5px] text-dust mt-0.5">{j.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= SKILLS ================= */}
      {tab === "skills" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {skills.length === 0 && <Card className="sm:col-span-2 xl:col-span-3"><EmptyState icon="graduation-cap" title="Aucune compétence trackée." sub="Ajoute les disciplines que tu forges." /></Card>}
          {skills.map((s, i) => {
            const lvlIdx = SKILL_LEVELS.findIndex((l) => l.key === s.level);
            const resources = parseJson<string[]>(s.resources, []);
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="h-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13.5px] font-semibold text-ash">{s.name}</p>
                      <p className="text-[10px] text-smoke mt-0.5 capitalize">{s.category}</p>
                    </div>
                    <button onClick={() => setEditSkill({ ...s })} className="p-1.5 rounded-lg text-smoke hover:text-dust"><Pencil className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {SKILL_LEVELS.map((l, li) => (
                      <span key={l.key} className={`flex-1 h-1.5 rounded-full ${li <= lvlIdx ? "bg-gradient-to-r from-ember to-flame" : "bg-line"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-ember mt-1.5">{SKILL_LEVELS[lvlIdx]?.label ?? s.level}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-smoke">Heures investies</span>
                    <span className="font-display font-bold text-flame">{s.hoursInvested} h</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[1, 5, 10].map((n) => (
                      <button key={n} onClick={async () => { await apiFetch("/api/skills", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, hoursInvested: Math.round((s.hoursInvested + n) * 10) / 10 }) }); load(); }}
                        className="text-[9.5px] px-2 py-1 rounded border border-line text-smoke hover:text-ember hover:border-ember/40 transition-all">+{n}h</button>
                    ))}
                  </div>
                  {resources.length > 0 && <p className="text-[10px] text-smoke mt-3"><span className="text-ember">Ressources :</span> {resources.join(", ")}</p>}
                  {s.nextStep && <p className="text-[10.5px] text-dust mt-2 border-l-2 border-ember/40 pl-2"><span className="text-smoke">Prochaine étape :</span> {s.nextStep}</p>}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= MODALS ================= */}
      <Modal open={Boolean(editGoal)} onClose={() => setEditGoal(null)} title={editGoal?.id ? "Modifier le but" : "Nouveau but"}>
        {editGoal && (
          <div className="space-y-3.5">
            <Field label="Titre"><Input value={editGoal.title ?? ""} onChange={(e) => setEditGoal({ ...editGoal, title: e.target.value })} /></Field>
            <Field label="Description"><Textarea rows={2} value={editGoal.description ?? ""} onChange={(e) => setEditGoal({ ...editGoal, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Niveau (hiérarchie des buts)">
                <Select value={editGoal.level} onChange={(e) => setEditGoal({ ...editGoal, level: Number(e.target.value) })}>
                  {GOAL_LEVELS.map((l) => <option key={l.level} value={l.level}>Niv. {l.level} — {l.name}</option>)}
                </Select>
              </Field>
              <Field label="Pilier">
                <Select value={editGoal.pillar ?? ""} onChange={(e) => setEditGoal({ ...editGoal, pillar: e.target.value })}>
                  <option value="">—</option>
                  {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Échéance (optionnel)"><Input type="date" value={editGoal.deadline ?? ""} onChange={(e) => setEditGoal({ ...editGoal, deadline: e.target.value || null })} /></Field>
              <Field label="Statut">
                <Select value={editGoal.status} onChange={(e) => setEditGoal({ ...editGoal, status: e.target.value })}>
                  <option value="active">En cours</option><option value="completed">Complété</option><option value="paused">En pause</option><option value="abandoned">Abandonné</option>
                </Select>
              </Field>
            </div>
            <Field label="Sous-objectifs (un par ligne)">
              <Textarea
                rows={3}
                placeholder={"Étape 1\nÉtape 2\nÉtape 3"}
                defaultValue={parseJson<Sub[]>(editGoal.subGoals, []).map((s) => s.title).join("\n")}
                onBlur={(e) => {
                  const prev = parseJson<Sub[]>(editGoal.subGoals, []);
                  const subs = e.target.value.split("\n").map((t) => t.trim()).filter(Boolean).map((t, i) => {
                    const old = prev[i];
                    return { id: old?.id ?? crypto.randomUUID(), title: t, done: old?.done ?? false };
                  });
                  setEditGoal((g) => ({ ...(g ?? {}), subGoals: subs as unknown as string }));
                }}
              />
            </Field>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              {editGoal.id ? <Btn variant="danger" small onClick={async () => { await apiFetch(`/api/goals/${editGoal.id}`, { method: "DELETE" }); setEditGoal(null); load(); }}><Trash2 className="w-3.5 h-3.5" /> Supprimer</Btn> : <span />}
              <Btn variant="primary" onClick={saveGoal}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editProject)} onClose={() => setEditProject(null)} title={editProject?.id ? "Modifier le projet" : "Nouveau projet phare"}>
        {editProject && (
          <div className="space-y-3.5">
            <Field label="Nom du projet"><Input value={editProject.name ?? ""} onChange={(e) => setEditProject({ ...editProject, name: e.target.value })} /></Field>
            <Field label="Description"><Textarea rows={2} value={editProject.description ?? ""} onChange={(e) => setEditProject({ ...editProject, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pilier">
                <Select value={editProject.pillar ?? ""} onChange={(e) => setEditProject({ ...editProject, pillar: e.target.value })}>
                  <option value="">—</option>
                  {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Statut">
                <Select value={editProject.status} onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}>
                  <option value="active">Actif</option><option value="completed">Accompli</option><option value="paused">En pause</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date début"><Input type="date" value={editProject.startDate ?? ""} onChange={(e) => setEditProject({ ...editProject, startDate: e.target.value })} /></Field>
              <Field label="Date fin (optionnel)"><Input type="date" value={editProject.endDate ?? ""} onChange={(e) => setEditProject({ ...editProject, endDate: e.target.value || null })} /></Field>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              {editProject.id ? <Btn variant="danger" small onClick={async () => { await apiFetch(`/api/projects/${editProject.id}`, { method: "DELETE" }); setEditProject(null); load(); }}><Trash2 className="w-3.5 h-3.5" /> Supprimer</Btn> : <span />}
              <Btn variant="primary" onClick={saveProject}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editSkill)} onClose={() => setEditSkill(null)} title={editSkill?.id ? "Modifier la compétence" : "Nouvelle compétence"}>
        {editSkill && (
          <div className="space-y-3.5">
            <Field label="Nom"><Input value={editSkill.name ?? ""} onChange={(e) => setEditSkill({ ...editSkill, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie">
                <Select value={editSkill.category} onChange={(e) => setEditSkill({ ...editSkill, category: e.target.value })}>
                  <option value="artisanale">Artisanale</option><option value="mentale">Mentale</option><option value="sociale">Sociale</option><option value="financiere">Financière</option>
                </Select>
              </Field>
              <Field label="Niveau estimé">
                <Select value={editSkill.level} onChange={(e) => setEditSkill({ ...editSkill, level: e.target.value })}>
                  {SKILL_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Ressources (séparées par des virgules)">
              <Input defaultValue={parseJson<string[]>(editSkill.resources, []).join(", ")}
                onBlur={(e) => setEditSkill((s) => ({ ...(s ?? {}), resources: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) as unknown as string }))} />
            </Field>
            <Field label="Prochaine étape"><Input value={editSkill.nextStep ?? ""} onChange={(e) => setEditSkill({ ...editSkill, nextStep: e.target.value })} /></Field>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              {editSkill.id ? <Btn variant="danger" small onClick={async () => { await apiFetch(`/api/skills?id=${editSkill.id}`, { method: "DELETE" }); setEditSkill(null); load(); }}><Trash2 className="w-3.5 h-3.5" /> Supprimer</Btn> : <span />}
              <Btn variant="primary" onClick={saveSkill}><Check className="w-4 h-4" /> Enregistrer</Btn>
            </div>
          </div>
        )}
      </Modal>
    </ScreenFrame>
  );
}
