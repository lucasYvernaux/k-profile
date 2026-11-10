"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScreenFrame } from "@/shared/layout/ScreenFrame";
import { Card, SectionTitle, Btn, Modal, Field, Input, Select, Textarea, EmptyState } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import {
  CHANNELS, COLD_COLOR, INNER_CIRCLE_MIN, INTERACTION_KINDS, INTIMACY,
  agoFr, daysSince, daysToBirthday, displayName, freshness, intimacyMeta, isCircleMember, lastTouch, lifeYears,
  parseChannels, shortName,
  type Channel, type Interaction, type Person, type PersonLink,
} from "@/features/network/domain/network";
import {
  GENDERS, LINK_GROUPS, choiceFromLink, linkFromChoice, linkKind, relationChoices, relationsTo, roleInLink,
  type LinkGroup,
} from "@/features/network/domain/kinship";
import type { Interest, PersonInterest } from "@/features/network/domain/interests";
import { addDays, formatKeyFr, todayKey } from "@/shared/lib/dates";
import { apiFetch } from "@/shared/lib/api-client";
import { NetworkWeb } from "./NetworkWeb";
import { FamilyTree } from "./FamilyTree";
import { InterestsBoard } from "./InterestsBoard";
import { InterestsInput } from "./InterestsInput";
import { Avatar, ChannelBadge, ColdBanner, InterestChip, IntimacyDots } from "./PersonBits";

const QUICK = ["vu", "appel", "visio", "message"] as const;

const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* ============================================================
   PAGE
   ============================================================ */

type DraftLink = { otherId: number; choice: string; label: string };

type Draft = {
  id?: number;
  isSelf: boolean;
  firstName: string;
  lastName: string;
  nickname: string;
  gender: string;
  intimacy: number;
  metAt: string;
  lastSeen: string;
  lastContact: string;
  lastContactKind: string;
  contactEveryDays: string;
  birthday: string;
  deceased: boolean;
  diedOn: string;
  cold: boolean;
  coldSince: string;
  coldReason: string;
  notes: string;
  channels: Channel[];
  interests: string[];
  links: DraftLink[];
};

const EMPTY: Draft = {
  isSelf: false, firstName: "", lastName: "", nickname: "", gender: "", intimacy: 3, metAt: "", lastSeen: "", lastContact: "",
  lastContactKind: "message", contactEveryDays: "", birthday: "", deceased: false, diedOn: "", cold: false, coldSince: "",
  coldReason: "", notes: "", channels: [], interests: [], links: [],
};

const SORTS = {
  urgent: "À recontacter d'abord",
  intimacy: "Intimité",
  name: "Nom",
  recent: "Contact le plus récent",
} as const;

const TABS = [
  ["fiches", "Fiches", "layout-grid"],
  ["toile", "Toile", "network"],
  ["arbre", "Arbre", "git-fork"],
  ["domaines", "Domaines", "tags"],
] as const;
type Tab = (typeof TABS)[number][0];

/** Relation options for a select, grouped (Famille / Couple / Social). */
function RelationOptions({ gender }: { gender?: string | null }) {
  const choices = relationChoices(gender);
  return (
    <>
      {(Object.keys(LINK_GROUPS) as LinkGroup[]).map((g) => (
        <optgroup key={g} label={LINK_GROUPS[g]}>
          {choices.filter((c) => c.group === g).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </optgroup>
      ))}
    </>
  );
}

export default function ReseauPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [links, setLinks] = useState<PersonLink[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [personInterests, setPersonInterests] = useState<PersonInterest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("fiches");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [coldOnly, setColdOnly] = useState(false);
  const [interestFilter, setInterestFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<keyof typeof SORTS>("urgent");
  const [selected, setSelected] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [toast, setToast] = useState<string | null>(null);
  const [log, setLog] = useState({ kind: "message", date: todayKey(), note: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [coldForm, setColdForm] = useState<{ since: string; reason: string } | null>(null);
  const [newChannel, setNewChannel] = useState<Channel>({ kind: "phone", value: "" });
  const [newLink, setNewLink] = useState({ otherId: "", choice: "amis", label: "" });

  const today = todayKey();

  const load = useCallback(async () => {
    const d = await apiFetch("/api/people", { cache: "no-store" }).then((r) => r.json());
    setPeople(d.people ?? []);
    setLinks(d.links ?? []);
    setInteractions(d.interactions ?? []);
    setInterests(d.interests ?? []);
    setPersonInterests(d.personInterests ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /** Shows the server's message when a request is refused (cycle, conflict…). */
  async function send(url: string, init: RequestInit) {
    const res = await apiFetch(url, init);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.issues?.[0] ? ` (${body.issues[0].path} : ${body.issues[0].message})` : "";
      setToast(typeof body?.error === "string" ? `${body.error}${detail}` : "Action refusée");
      return null;
    }
    return res.json().catch(() => ({}));
  }

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const self = people.find((p) => p.isSelf) ?? null;
  const members = useMemo(() => people.filter(isCircleMember), [people]);
  const interestById = useMemo(() => new Map(interests.map((i) => [i.id, i])), [interests]);
  const interestsOf = useCallback(
    (personId: number) =>
      personInterests
        .filter((pi) => pi.personId === personId)
        .map((pi) => interestById.get(pi.interestId))
        .filter((i): i is Interest => Boolean(i))
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [personInterests, interestById]
  );
  /** Relation of each person to me ("Cousine", "Beau-frère"…), when my record exists. */
  const toMe = useMemo(() => (self ? relationsTo(self.id, people, links) : new Map<number, string>()), [self, people, links]);

  const linksOf = useCallback(
    (id: number) =>
      links
        .filter((l) => l.aId === id || l.bId === id)
        .map((l) => ({ link: l, other: byId.get(l.aId === id ? l.bId : l.aId) }))
        .filter((x): x is { link: PersonLink; other: Person } => Boolean(x.other)),
    [links, byId]
  );

  const nameOf = (p: Person) => (p.isSelf ? "Moi" : shortName(p));

  /* ---------- Vue d'ensemble ---------- */
  const inner = members.filter((p) => p.intimacy >= INNER_CIRCLE_MIN && !p.deceased);
  const cold = members.filter((p) => p.coldSince);
  const overdue = members
    .map((p) => ({ p, f: freshness(p, today) }))
    .filter((x) => x.f.status === "late")
    .sort((a, b) => b.p.intimacy - a.p.intimacy || b.f.ratio - a.f.ratio);
  const week = interactions.filter((i) => i.date >= addDays(today, -6));
  const weekPeople = new Set(week.map((i) => i.personId)).size;
  const birthdays = members
    .filter((p) => !p.deceased)
    .map((p) => ({ p, d: daysToBirthday(p.birthday, today) }))
    .filter((x): x is { p: Person; d: number } => x.d !== null && x.d <= 14)
    .sort((a, b) => a.d - b.d);

  const list = (() => {
    const s = q.trim().toLowerCase();
    const out = members.filter(
      (p) =>
        (level === null || p.intimacy === level) &&
        (!coldOnly || p.coldSince) &&
        (interestFilter === null || personInterests.some((pi) => pi.personId === p.id && pi.interestId === interestFilter)) &&
        (!s ||
          [p.firstName, p.lastName, p.nickname, p.notes, p.coldReason, toMe.get(p.id), ...interestsOf(p.id).map((i) => i.name)].some((v) =>
            v?.toLowerCase().includes(s)
          ))
    );
    const touch = (p: Person) => lastTouch(p) ?? "";
    return out.sort((a, b) => {
      if (sort === "name") return displayName(a).localeCompare(displayName(b), "fr");
      if (sort === "intimacy") return b.intimacy - a.intimacy || displayName(a).localeCompare(displayName(b), "fr");
      if (sort === "recent") return touch(b).localeCompare(touch(a));
      return freshness(b, today).ratio - freshness(a, today).ratio || b.intimacy - a.intimacy;
    });
  })();

  /* ---------- Actions ---------- */
  async function logContact(personId: number, kind: string, date = today, note = "") {
    const p = byId.get(personId);
    const res = await send("/api/people/interactions", json("POST", { personId, kind, date, note }));
    if (!res) return;
    const label = INTERACTION_KINDS[kind]?.label ?? kind;
    setToast(`${label} avec ${p ? shortName(p) : "?"} noté${res.circleChecked && date === today ? " · tâche d'entretien « cercle » validée ✓" : ""}`);
    load();
  }

  async function deleteInteraction(id: number) {
    await apiFetch(`/api/people/interactions?id=${id}`, { method: "DELETE" });
    load();
  }

  async function setColdState(personId: number, isCold: boolean, since?: string, reason?: string) {
    const res = await send("/api/people/cold", json("POST", { personId, cold: isCold, since: since || undefined, reason }));
    if (!res) return;
    const p = byId.get(personId);
    setToast(isCold ? `En froid avec ${p ? shortName(p) : "?"} — plus de rappel de contact` : `Réconciliés avec ${p ? shortName(p) : "?"} ✓`);
    setColdForm(null);
    load();
  }

  function openNew(isSelf = false) {
    setDraft({ ...EMPTY, isSelf, firstName: isSelf ? "Moi" : "", metAt: isSelf ? "" : today });
    setNewChannel({ kind: "phone", value: "" });
    setNewLink({ otherId: "", choice: "amis", label: "" });
    setFormOpen(true);
  }

  function openEdit(p: Person) {
    setDraft({
      id: p.id,
      isSelf: p.isSelf,
      firstName: p.firstName,
      lastName: p.lastName ?? "",
      nickname: p.nickname ?? "",
      gender: p.gender ?? "",
      intimacy: p.intimacy,
      metAt: p.metAt ?? "",
      lastSeen: p.lastSeen ?? "",
      lastContact: p.lastContact ?? "",
      lastContactKind: p.lastContactKind ?? "message",
      contactEveryDays: p.contactEveryDays?.toString() ?? "",
      birthday: p.birthday ?? "",
      deceased: p.deceased,
      diedOn: p.diedOn ?? "",
      cold: Boolean(p.coldSince),
      coldSince: p.coldSince ?? "",
      coldReason: p.coldReason ?? "",
      notes: p.notes ?? "",
      channels: parseChannels(p.channels),
      interests: interestsOf(p.id).map((i) => i.name),
      links: linksOf(p.id).map(({ link, other }) => ({ otherId: other.id, choice: choiceFromLink(link, p.id), label: link.label ?? "" })),
    });
    setNewChannel({ kind: "phone", value: "" });
    setNewLink({ otherId: "", choice: "amis", label: "" });
    setDetailId(null);
    setFormOpen(true);
  }

  async function savePerson() {
    if (!draft.firstName.trim()) return;
    // ajoute ce qui est encore dans les champs « nouveau »
    const channels = newChannel.value.trim() ? [...draft.channels, newChannel] : draft.channels;
    const draftLinks = newLink.otherId
      ? [...draft.links.filter((l) => l.otherId !== Number(newLink.otherId)), { otherId: Number(newLink.otherId), choice: newLink.choice, label: newLink.label }]
      : draft.links;

    const { id: draftId, isSelf, links: _links, cold: isCold, ...fields } = draft;
    const body = {
      ...fields,
      channels,
      coldSince: isCold ? fields.coldSince || today : "",
      coldReason: isCold ? fields.coldReason : "",
      diedOn: fields.deceased ? fields.diedOn : "",
      ...(draftId ? { id: draftId } : { isSelf }),
    };
    const res = await send("/api/people", json(draftId ? "PUT" : "POST", body));
    if (!res) return;
    const id: number = draftId ?? res.id;

    // synchronise les liens (sens compris : « X est le père de Y »)
    const current = draftId ? linksOf(draftId) : [];
    const wanted = new Set(draftLinks.map((l) => l.otherId));
    for (const { link, other } of current) {
      if (!wanted.has(other.id)) await apiFetch(`/api/people/links?id=${link.id}`, { method: "DELETE" });
    }
    for (const l of draftLinks) {
      const before = current.find((c) => c.other.id === l.otherId);
      if (before && choiceFromLink(before.link, id) === l.choice && (before.link.label ?? "") === l.label) continue;
      await send("/api/people/links", json("POST", { ...linkFromChoice(id, l.otherId, l.choice), label: l.label }));
    }
    setFormOpen(false);
    setToast(draftId ? "Fiche mise à jour" : isSelf ? "Ta fiche « Moi » est créée" : `${draft.firstName} rejoint ton réseau`);
    await load();
    if (id) setDetailId(id);
  }

  async function deletePerson(id: number) {
    await apiFetch(`/api/people?id=${id}`, { method: "DELETE" });
    setDetailId(null);
    setSelected(null);
    setConfirmDelete(false);
    load();
  }

  async function updateInterest(id: number, patch: { name?: string; color?: string | null }) {
    const res = await send("/api/people/interests", json("PUT", { id, ...patch }));
    if (res?.merged) setToast("Domaines fusionnés");
    await load();
  }

  async function deleteInterest(id: number) {
    await apiFetch(`/api/people/interests?id=${id}`, { method: "DELETE" });
    if (interestFilter === id) setInterestFilter(null);
    await load();
  }

  function openDetail(id: number) {
    setDetailId(id);
    setLog({ kind: "message", date: today, note: "" });
    setConfirmDelete(false);
    setColdForm(null);
  }

  const detail = detailId !== null ? byId.get(detailId) ?? null : null;
  const detailHistory = detail ? interactions.filter((i) => i.personId === detail.id) : [];
  const selPerson = selected !== null ? byId.get(selected) ?? null : null;
  const webHighlight = useMemo(
    () => (interestFilter === null ? null : new Set(personInterests.filter((pi) => pi.interestId === interestFilter).map((pi) => pi.personId))),
    [interestFilter, personInterests]
  );

  /* ---------- Rendu d'une fiche ---------- */
  function renderCard(p: Person) {
    const fr = freshness(p, today);
    const ch = parseChannels(p.channels);
    const lk = linksOf(p.id);
    const tags = interestsOf(p.id);
    const bday = p.deceased ? null : daysToBirthday(p.birthday, today);
    const relation = toMe.get(p.id);
    const accent = p.coldSince ? COLD_COLOR : intimacyMeta(p.intimacy).color;
    return (
      <motion.div
        key={p.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={() => openDetail(p.id)}
        className={`card-frame p-4 cursor-pointer hover:border-line2 transition-colors relative overflow-hidden ${p.deceased ? "opacity-75" : ""}`}
      >
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.7 }} />
        <div className="flex items-start gap-3">
          <Avatar p={p} />
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openDetail(p.id); }}
              className="block max-w-full text-left text-[14px] font-semibold text-ash truncate hover:underline"
            >
              {displayName(p)}{p.deceased ? " †" : ""}
            </button>
            <p className="text-[11px] text-smoke truncate">
              {[p.nickname ? `« ${p.nickname} »` : null, relation].filter(Boolean).join(" · ") || " "}
            </p>
            <div className="mt-1"><IntimacyDots level={p.intimacy} /></div>
          </div>
          {p.coldSince ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1" style={{ borderColor: `${COLD_COLOR}55`, color: COLD_COLOR, background: `${COLD_COLOR}10` }}>
              ❄ En froid
            </span>
          ) : (
            bday !== null && bday <= 14 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ember/10 border border-ember/30 text-flame shrink-0" title="Anniversaire">
                🎂 {bday === 0 ? "aujourd'hui" : `J-${bday}`}
              </span>
            )
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-3.5">
          {[
            { label: "Rencontré", value: p.metAt ? agoFr(daysSince(p.metAt, today)) : "—", color: "#a3a3a3" },
            { label: "Vu en vrai", value: agoFr(daysSince(p.lastSeen, today)), color: p.lastSeen ? "#e5e5e5" : "#a0a0a0" },
            {
              label: p.lastContactKind && INTERACTION_KINDS[p.lastContactKind] ? INTERACTION_KINDS[p.lastContactKind].label : "Contact",
              value: agoFr(daysSince(p.lastContact, today)),
              color: p.lastContact ? "#e5e5e5" : "#a0a0a0",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-[#121214] border border-line px-2 py-1.5 min-w-0">
              <div className="text-[8.5px] uppercase tracking-[0.12em] text-smoke truncate">{s.label}</div>
              <div className="text-[11px] font-semibold truncate" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {p.coldSince ? (
          <p className="text-[10px] mt-2.5 truncate" style={{ color: COLD_COLOR }} title={p.coldReason ?? undefined}>
            Depuis {agoFr(daysSince(p.coldSince, today)).replace("il y a ", "")}{p.coldReason ? ` · ${p.coldReason}` : ""}
          </p>
        ) : (
          fr.every && fr.status !== "none" && (
            <div className="mt-2.5">
              {/* Decorative: the sentence below says the same thing (and ratio exceeds 1 when late). */}
              <div className="h-1 rounded-full bg-line overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, fr.ratio * 100)}%`, background: fr.color }} />
              </div>
              <p className="text-[9.5px] mt-1" style={{ color: fr.color }}>
                {fr.status === "late"
                  ? fr.since === null ? "Jamais contacté·e" : `En retard de ${fr.since - fr.every} j (rythme : ${fr.every} j)`
                  : `Prochain contact dans ${fr.every - (fr.since ?? 0)} j`}
              </p>
            </div>
          )
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.slice(0, 5).map((i) => (
              <InterestChip key={i.id} interest={i} active={interestFilter === i.id} onClick={() => setInterestFilter(interestFilter === i.id ? null : i.id)} />
            ))}
            {tags.length > 5 && <span className="text-[10px] text-smoke">+{tags.length - 5}</span>}
          </div>
        )}

        {ch.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {ch.map((c, i) => <ChannelBadge key={i} c={c} compact />)}
          </div>
        )}

        {lk.length > 0 && (
          <div className="flex items-center gap-1 mt-2.5 flex-wrap">
            <DynIcon name="network" className="w-3 h-3 text-smoke" />
            {lk.slice(0, 4).map(({ link, other }) => (
              <span key={link.id} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${linkKind(link.kind).color}40`, color: "#a3a3a3" }} title={roleInLink(link, other.id, other.gender)}>
                {nameOf(other)}
              </span>
            ))}
            {lk.length > 4 && <span className="text-[10px] text-smoke">+{lk.length - 4}</span>}
          </div>
        )}

        {!p.deceased && (
          <div className="flex gap-1 mt-3 pt-3 border-t border-line">
            {QUICK.map((k) => (
              <button key={k} onClick={(e) => { e.stopPropagation(); logContact(p.id, k); }} className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md border border-line text-dust hover:text-ash hover:border-ember/50 hover:bg-ember/5 transition-colors" aria-label={`Noter : ${INTERACTION_KINDS[k].label} aujourd'hui`}>
                <DynIcon name={INTERACTION_KINDS[k].icon} className="w-3 h-3" />
                {k === "vu" ? "Vu" : INTERACTION_KINDS[k].label}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  const linkCandidates = people
    .filter((p) => p.id !== draft.id && !(draft.isSelf && p.isSelf) && !draft.links.some((l) => l.otherId === p.id))
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || displayName(a).localeCompare(displayName(b), "fr"));
  const draftName = draft.isSelf ? "moi" : draft.firstName.trim() || "cette personne";
  const newLinkOther = newLink.otherId ? byId.get(Number(newLink.otherId)) : undefined;

  return (
    <ScreenFrame title="Conseil des Ombres">
      {/* ===== EN-TÊTE ===== */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-smoke mb-1.5">Conseil des Ombres — Réseau · Cercle · Liens</div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ash">On ne règne jamais seul</h1>
        </div>
        <Btn variant="primary" onClick={() => openNew()}>
          <DynIcon name="user-plus" className="w-3.5 h-3.5" /> Ajouter une personne
        </Btn>
      </div>

      {/* ===== TÂCHE DU JOUR + CHIFFRES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3 mb-4">
        <Card hairline className="flex items-center gap-4">
          <DynIcon name="users" className="w-6 h-6 text-ember shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-ash">Cercle intime</h2>
            <p className="text-[12px] text-dust mt-0.5">
              Noter un contact avec un {INTIMACY[4].label.toLowerCase()} ou ton {INTIMACY[5].label.toLowerCase()} valide aussi la
              tâche d&apos;entretien « Contacter un membre du cercle ».
            </p>
          </div>
        </Card>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Réseau", value: members.length, color: "#e5e5e5" },
            { label: "Cercle", value: inner.length, color: "#f59e0b" },
            { label: "En retard", value: overdue.length, color: overdue.length ? "#f87171" : "#10b981" },
            { label: cold.length ? "En froid" : "Vus 7 j", value: cold.length || weekPeople, color: cold.length ? COLD_COLOR : "#a78bfa" },
          ].map((s) => (
            <div key={s.label} className="card-frame px-3 py-3 flex flex-col justify-center">
              <div className="text-[9px] uppercase tracking-[0.14em] text-smoke">{s.label}</div>
              <div className="font-display text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-mono-family)" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== À RECONTACTER ===== */}
      {(overdue.length > 0 || birthdays.length > 0) && (
        <Card className="mb-4">
          <SectionTitle icon="bell" title="À recontacter" sub="Rythme dépassé — les plus proches d'abord (les personnes en froid sont mises en pause)" />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {birthdays.map(({ p, d }) => (
              <div key={`b-${p.id}`} className="shrink-0 flex items-center gap-2.5 rounded-xl border border-ember/40 bg-ember/[0.06] px-3 py-2">
                <Avatar p={p} size={32} />
                <div>
                  <p className="text-[12px] font-semibold text-ash">{shortName(p)}</p>
                  <p className="text-[10px] text-flame">🎂 {d === 0 ? "Anniversaire aujourd'hui" : `Anniversaire dans ${d} j`}</p>
                </div>
              </div>
            ))}
            {overdue.slice(0, 12).map(({ p, f }) => (
              <div key={p.id} className="shrink-0 flex items-center gap-2.5 rounded-xl border border-line bg-[#131315] pl-3 pr-2 py-2">
                <button onClick={() => openDetail(p.id)} className="flex items-center gap-2.5 text-left">
                  <Avatar p={p} size={32} />
                  <div>
                    <p className="text-[12px] font-semibold text-ash">{shortName(p)}</p>
                    <p className="text-[10px] text-blood">{f.since === null ? "jamais contacté·e" : `${f.since} j / ${f.every} j`}</p>
                  </div>
                </button>
                <div className="flex gap-0.5 ml-1">
                  {(["message", "appel"] as const).map((k) => (
                    <button key={k} onClick={() => logContact(p.id, k)} className="p-1.5 rounded-md text-smoke hover:text-ember hover:bg-ember/10" aria-label={`Noter : ${INTERACTION_KINDS[k].label}`}>
                      <DynIcon name={INTERACTION_KINDS[k].icon} className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== ONGLETS ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex p-1 rounded-xl border border-line bg-[#111112] overflow-x-auto max-w-full">
          {TABS.map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] transition-colors shrink-0 ${tab === k ? "text-flame" : "text-dust hover:text-ash"}`}
            >
              {tab === k && <motion.span layoutId="reseau-tab" className="absolute inset-0 rounded-lg bg-ember/10 border border-ember/30" />}
              <DynIcon name={icon} className="w-3.5 h-3.5 relative" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        {tab === "fiches" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <DynIcon name="search" className="w-3.5 h-3.5 text-smoke absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input placeholder="Nom, domaine, relation…" value={q} onChange={(e) => setQ(e.target.value)} className="!pl-8 !py-1.5 w-48" />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} aria-label="Trier les fiches" className="!py-1.5 !w-auto text-xs">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        )}
        {(tab === "fiches" || tab === "toile") && interests.length > 0 && (
          <Select
            value={interestFilter ?? ""}
            onChange={(e) => setInterestFilter(e.target.value ? Number(e.target.value) : null)}
            className="!py-1.5 !w-auto text-xs"
            aria-label="Filtrer par domaine"
          >
            <option value="">Tous les domaines</option>
            {interests.map((i) => (
              <option key={i.id} value={i.id}>{i.name} · {personInterests.filter((pi) => pi.interestId === i.id).length}</option>
            ))}
          </Select>
        )}
      </div>

      {tab === "fiches" && (
        <>
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button
              onClick={() => { setLevel(null); setColdOnly(false); }}
              className={`text-[10px] px-2.5 py-1 rounded-full border ${level === null && !coldOnly ? "border-ember/50 text-flame bg-ember/10" : "border-line text-dust hover:text-ash"}`}
            >
              Tous · {members.length}
            </button>
            {[5, 4, 3, 2, 1].map((l) => {
              const n = members.filter((p) => p.intimacy === l).length;
              if (!n) return null;
              return (
                <button
                  key={l}
                  onClick={() => setLevel(level === l ? null : l)}
                  className="text-[10px] px-2.5 py-1 rounded-full border transition-colors"
                  style={level === l ? { borderColor: `${INTIMACY[l].color}90`, color: INTIMACY[l].color, background: `${INTIMACY[l].color}14` } : { borderColor: "#26262a", color: "#a3a3a3" }}
                >
                  {INTIMACY[l].label} · {n}
                </button>
              );
            })}
            {cold.length > 0 && (
              <button
                onClick={() => setColdOnly(!coldOnly)}
                className="text-[10px] px-2.5 py-1 rounded-full border transition-colors"
                style={coldOnly ? { borderColor: COLD_COLOR, color: COLD_COLOR, background: `${COLD_COLOR}14` } : { borderColor: "#26262a", color: "#a3a3a3" }}
              >
                ❄ En froid · {cold.length}
              </button>
            )}
            {interestFilter !== null && interestById.get(interestFilter) && (
              <InterestChip interest={interestById.get(interestFilter)!} active onClick={() => setInterestFilter(null)} />
            )}
          </div>
          {loaded && members.length === 0 ? (
            <Card>
              <EmptyState icon="users" title="Ton Conseil est vide" sub="Ajoute les personnes qui comptent : famille, amis, alliés." />
              <div className="text-center"><Btn variant="primary" onClick={() => openNew()}>Ajouter la première personne</Btn></div>
            </Card>
          ) : list.length === 0 ? (
            <EmptyState icon="search" title="Personne ne correspond" />
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence>
                {list.map((p) => renderCard(p))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      {tab === "toile" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <Card>
            <NetworkWeb
              people={members}
              links={links}
              selfId={self?.id ?? null}
              highlight={webHighlight}
              selectedId={selected}
              onSelect={setSelected}
              onOpen={openDetail}
            />
          </Card>
          <Card className="self-start lg:sticky lg:top-20">
            {selPerson ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar p={selPerson} size={48} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ash truncate">{selPerson.isSelf ? "Moi" : displayName(selPerson)}</p>
                    {!selPerson.isSelf && <IntimacyDots level={selPerson.intimacy} />}
                  </div>
                </div>
                {!selPerson.isSelf && (
                  <p className="text-[11px] text-smoke mb-3">
                    {toMe.get(selPerson.id) ? `${toMe.get(selPerson.id)} · ` : ""}Vu {agoFr(daysSince(selPerson.lastSeen, today))} · contact {agoFr(daysSince(selPerson.lastContact, today))}
                  </p>
                )}
                <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Liens · {linksOf(selPerson.id).length}</div>
                <div className="space-y-1 mb-4 max-h-72 overflow-y-auto">
                  {linksOf(selPerson.id).length === 0 && <p className="text-[11px] text-smoke">Aucun lien pour l&apos;instant.</p>}
                  {linksOf(selPerson.id).map(({ link, other }) => {
                    const m = linkKind(link.kind);
                    return (
                      <button key={link.id} onClick={() => setSelected(other.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-raise/60 text-left">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                        <span className="text-[12px] text-ash flex-1 truncate">{nameOf(other)}</span>
                        <span className="text-[10px] text-smoke">{link.label || roleInLink(link, other.id, other.gender)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <Btn small variant="outline" className="flex-1" onClick={() => openDetail(selPerson.id)}>Ouvrir la fiche</Btn>
                  {!selPerson.isSelf && (
                    <Btn small onClick={() => logContact(selPerson.id, "message")}>
                      <DynIcon name="message-circle" className="w-3 h-3" />
                    </Btn>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <DynIcon name="network" className="w-6 h-6 text-smoke mx-auto mb-2" />
                <p className="text-[12px] text-dust">Sélectionne une personne</p>
                <p className="text-[10px] text-smoke mt-1">pour voir avec qui elle est liée.</p>
                <div className="mt-4 space-y-1.5 text-left">
                  {[5, 4, 3, 2, 1].map((l) => (
                    <div key={l} className="flex items-center gap-2 text-[10px]">
                      <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: INTIMACY[l].color }} />
                      <span className="text-dust flex-1">{INTIMACY[l].label}</span>
                      <span className="text-smoke">{INTIMACY[l].every ? `tous les ${INTIMACY[l].every} j` : "libre"}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed" style={{ borderColor: COLD_COLOR }} />
                    <span className="text-dust flex-1">En froid</span>
                    <span className="text-smoke">en pause</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "arbre" && (
        <Card>
          <FamilyTree people={people} links={links} onOpen={openDetail} onCreateSelf={() => openNew(true)} />
        </Card>
      )}

      {tab === "domaines" && (
        <InterestsBoard
          people={people}
          interests={interests}
          personInterests={personInterests}
          onOpen={openDetail}
          onUpdate={updateInterest}
          onDelete={deleteInterest}
        />
      )}

      {/* ===== MODALE : FICHE ===== */}
      <Modal open={detail !== null} onClose={() => setDetailId(null)} title={detail?.isSelf ? "Ma fiche" : "Fiche"} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar p={detail} size={64} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl font-bold text-ash">{displayName(detail)}{detail.deceased ? " †" : ""}</p>
                <p className="text-[12px] text-smoke">
                  {[detail.nickname ? `« ${detail.nickname} »` : null, toMe.get(detail.id), lifeYears(detail)].filter(Boolean).join(" · ")}
                </p>
                {!detail.isSelf && <div className="mt-1"><IntimacyDots level={detail.intimacy} /></div>}
              </div>
              <Btn small onClick={() => openEdit(detail)}><DynIcon name="pencil" className="w-3.5 h-3.5" /> Modifier</Btn>
            </div>

            <ColdBanner p={detail} onEnd={() => setColdState(detail.id, false)} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ...(detail.isSelf ? [] : [
                  { label: "Rencontré", date: detail.metAt },
                  { label: "Vu en vrai", date: detail.lastSeen },
                  { label: `Dernier contact${detail.lastContactKind && INTERACTION_KINDS[detail.lastContactKind] ? ` (${INTERACTION_KINDS[detail.lastContactKind].label.toLowerCase()})` : ""}`, date: detail.lastContact },
                ]),
                { label: "Naissance", date: detail.birthday },
                ...(detail.deceased ? [{ label: "Décès", date: detail.diedOn }] : []),
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-[#121214] border border-line px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-smoke">{s.label}</div>
                  <div className="text-[12px] font-semibold text-ash capitalize">{s.date ? formatKeyFr(s.date) : "—"}</div>
                  {s.date && s.label !== "Naissance" && <div className="text-[10px] text-smoke">{agoFr(daysSince(s.date, today))}</div>}
                  {s.date && s.label === "Naissance" && !detail.deceased && <div className="text-[10px] text-smoke">anniversaire dans {daysToBirthday(s.date, today)} j</div>}
                </div>
              ))}
            </div>

            {interestsOf(detail.id).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Domaines</div>
                <div className="flex flex-wrap gap-1.5">
                  {interestsOf(detail.id).map((i) => (
                    <InterestChip
                      key={i.id}
                      interest={i}
                      count={personInterests.filter((pi) => pi.interestId === i.id).length}
                      onClick={() => { setInterestFilter(i.id); setTab("fiches"); setDetailId(null); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {parseChannels(detail.channels).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Le joindre</div>
                <div className="space-y-1">
                  {parseChannels(detail.channels).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <ChannelBadge c={c} />
                      <span className="text-[12px] text-dust truncate select-all">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linksOf(detail.id).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Liens</div>
                <div className="flex flex-wrap gap-1.5">
                  {linksOf(detail.id).map(({ link, other }) => {
                    const m = linkKind(link.kind);
                    return (
                      <button key={link.id} onClick={() => openDetail(other.id)} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border hover:bg-raise/60" style={{ borderColor: `${m.color}55` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                        <span className="text-ash">{nameOf(other)}</span>
                        <span className="text-smoke">· {link.label || roleInLink(link, other.id, other.gender)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.notes && <p className="text-[12px] text-dust whitespace-pre-wrap rounded-lg bg-[#121214] border border-line p-3">{detail.notes}</p>}

            {!detail.isSelf && !detail.deceased && (
              <>
                {/* Noter un contact */}
                <div className="rounded-xl border border-ember/25 bg-ember/[0.04] p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-ember mb-2">Noter un contact</div>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {Object.entries(INTERACTION_KINDS).map(([k, m]) => (
                      <button
                        key={k}
                        onClick={() => setLog({ ...log, kind: k })}
                        className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${log.kind === k ? "border-ember/60 text-flame bg-ember/10" : "border-line text-dust hover:text-ash"}`}
                      >
                        <DynIcon name={m.icon} className="w-3 h-3" /> {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <Input type="date" aria-label="Date du contact" value={log.date} max={today} onChange={(e) => setLog({ ...log, date: e.target.value || today })} className="!w-40" />
                    <Input placeholder="Note (facultatif)" value={log.note} onChange={(e) => setLog({ ...log, note: e.target.value })} />
                    <Btn variant="primary" onClick={() => { logContact(detail.id, log.kind, log.date, log.note); setLog({ ...log, note: "" }); }}>Noter</Btn>
                  </div>
                </div>

                {/* En froid */}
                {!detail.coldSince && (
                  coldForm ? (
                    <div className="rounded-xl border border-sky-300/30 bg-sky-300/[0.04] p-3 space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: COLD_COLOR }}>En froid avec {shortName(detail)}</div>
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <Input type="date" value={coldForm.since} max={today} onChange={(e) => setColdForm({ ...coldForm, since: e.target.value })} className="!w-40" aria-label="Depuis le" />
                        <Input placeholder="Motif (facultatif)" maxLength={500} value={coldForm.reason} onChange={(e) => setColdForm({ ...coldForm, reason: e.target.value })} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Btn small onClick={() => setColdForm(null)}>Annuler</Btn>
                        <Btn small variant="primary" onClick={() => setColdState(detail.id, true, coldForm.since, coldForm.reason)}>❄ Confirmer</Btn>
                      </div>
                      <p className="text-[10px] text-smoke">Les rappels de contact sont mis en pause tant que vous êtes en froid.</p>
                    </div>
                  ) : (
                    <button onClick={() => setColdForm({ since: today, reason: "" })} className="text-[11px] text-smoke hover:text-sky-300 flex items-center gap-1.5">
                      <DynIcon name="snowflake" className="w-3.5 h-3.5" /> Je suis en froid avec {shortName(detail)}
                    </button>
                  )
                )}

                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-2">Historique · {detailHistory.length}</div>
                  {detailHistory.length === 0 ? (
                    <p className="text-[11px] text-smoke">Aucun contact noté.</p>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {detailHistory.map((h) => (
                        <div key={h.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-raise/40">
                          <DynIcon name={INTERACTION_KINDS[h.kind]?.icon ?? "sparkles"} className="w-3.5 h-3.5 text-ember shrink-0" />
                          <span className="text-[11px] text-ash w-28 shrink-0 capitalize">{formatKeyFr(h.date)}</span>
                          <span className="text-[11px] text-dust shrink-0">{INTERACTION_KINDS[h.kind]?.label ?? h.kind}</span>
                          <span className="text-[11px] text-smoke truncate flex-1">{h.note}</span>
                          <button onClick={() => deleteInteraction(h.id)} className="p-1 text-smoke [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 hover:text-blood" aria-label={`Supprimer l'interaction du ${h.date}`}>
                            <DynIcon name="trash-2" className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-2 border-t border-line">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-blood">Supprimer {nameOf(detail)}, ses liens et son historique ?</span>
                  <Btn small onClick={() => setConfirmDelete(false)}>Non</Btn>
                  <Btn small variant="danger" onClick={() => deletePerson(detail.id)}>Oui, supprimer</Btn>
                </div>
              ) : (
                <Btn small variant="danger" onClick={() => setConfirmDelete(true)}>
                  <DynIcon name="trash-2" className="w-3.5 h-3.5" /> Supprimer
                </Btn>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ===== MODALE : AJOUT / MODIFICATION ===== */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={draft.isSelf ? (draft.id ? "Modifier ma fiche" : "Ma fiche « Moi »") : draft.id ? "Modifier la fiche" : "Nouvelle personne"}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="Prénom *">
              <Input autoFocus value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            </Field>
            <Field label="Nom">
              <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </Field>
            <Field label="Surnom">
              <Input value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
            </Field>
            <Field label="Genre">
              <Select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
                <option value="">Non précisé</option>
                {Object.entries(GENDERS).filter(([k]) => k !== "autre").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                <option value="autre">Autre</option>
              </Select>
            </Field>
          </div>

          {!draft.isSelf && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Niveau d&apos;intimité</div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((l) => {
                  const m = INTIMACY[l];
                  const on = draft.intimacy === l;
                  return (
                    <button
                      key={l}
                      onClick={() => setDraft({ ...draft, intimacy: l })}
                      className="rounded-lg border px-1 py-2 transition-colors"
                      style={on ? { borderColor: m.color, background: `${m.color}18` } : { borderColor: "#26262a" }}
                    >
                      <div className="flex justify-center gap-0.5 mb-1">
                        {Array.from({ length: l }, (_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: on ? m.color : "#525252" }} />)}
                      </div>
                      <div className="text-[10px] font-semibold leading-tight" style={{ color: on ? m.color : "#a3a3a3" }}>{m.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {!draft.isSelf && (
              <>
                <Field label="Rencontré le">
                  <Input type="date" value={draft.metAt} max={today} onChange={(e) => setDraft({ ...draft, metAt: e.target.value })} />
                </Field>
                <Field label="Vu en vrai le">
                  <Input type="date" value={draft.lastSeen} max={today} onChange={(e) => setDraft({ ...draft, lastSeen: e.target.value })} />
                </Field>
                <Field label="Dernier contact">
                  <Input type="date" value={draft.lastContact} max={today} onChange={(e) => setDraft({ ...draft, lastContact: e.target.value })} />
                </Field>
                <Field label="Par">
                  <Select value={draft.lastContactKind} onChange={(e) => setDraft({ ...draft, lastContactKind: e.target.value })}>
                    {Object.entries(INTERACTION_KINDS).filter(([k]) => k !== "vu").map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </Select>
                </Field>
              </>
            )}
            <Field label="Date de naissance">
              <Input type="date" value={draft.birthday} onChange={(e) => setDraft({ ...draft, birthday: e.target.value })} />
            </Field>
            {!draft.isSelf && (
              <Field label="Recontacter tous les (j)">
                <Input inputMode="numeric" placeholder={intimacyMeta(draft.intimacy).every ? `${intimacyMeta(draft.intimacy).every} (défaut)` : "libre"} value={draft.contactEveryDays} onChange={(e) => setDraft({ ...draft, contactEveryDays: e.target.value })} />
              </Field>
            )}
          </div>

          {/* Statut : en froid, décès */}
          {!draft.isSelf && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-xl border p-3 ${draft.cold ? "border-sky-300/40 bg-sky-300/[0.04]" : "border-line"}`}>
                <label className="flex items-center gap-2 text-[12px] text-ash cursor-pointer">
                  <input type="checkbox" checked={draft.cold} onChange={(e) => setDraft({ ...draft, cold: e.target.checked, coldSince: draft.coldSince || today })} className="accent-sky-300" />
                  ❄ En froid
                </label>
                {draft.cold && (
                  <div className="space-y-2 mt-2">
                    <Input type="date" value={draft.coldSince} max={today} onChange={(e) => setDraft({ ...draft, coldSince: e.target.value })} aria-label="En froid depuis le" />
                    <Textarea rows={2} maxLength={500} placeholder="Motif (facultatif)" value={draft.coldReason} onChange={(e) => setDraft({ ...draft, coldReason: e.target.value })} />
                  </div>
                )}
              </div>
              <div className={`rounded-xl border p-3 ${draft.deceased ? "border-line2 bg-raise/30" : "border-line"}`}>
                <label className="flex items-center gap-2 text-[12px] text-ash cursor-pointer">
                  <input type="checkbox" checked={draft.deceased} onChange={(e) => setDraft({ ...draft, deceased: e.target.checked })} />
                  † Décédé·e
                </label>
                {draft.deceased && (
                  <div className="mt-2">
                    <Input type="date" value={draft.diedOn} max={today} onChange={(e) => setDraft({ ...draft, diedOn: e.target.value })} aria-label="Date du décès" />
                    <p className="text-[10px] text-smoke mt-1">Reste dans l&apos;arbre, sans rappel de contact.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Domaines */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Domaines / centres d&apos;intérêt</div>
            <InterestsInput value={draft.interests} onChange={(names) => setDraft({ ...draft, interests: names })} known={interests} />
          </div>

          {/* Moyens de contact */}
          {!draft.isSelf && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Moyens de contact</div>
              {draft.channels.length > 0 && (
                <div className="space-y-1 mb-2">
                  {draft.channels.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <ChannelBadge c={c} />
                      <Input aria-label={`${CHANNELS[c.kind]?.label ?? "Contact"} : identifiant`} value={c.value} onChange={(e) => setDraft({ ...draft, channels: draft.channels.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} className="!py-1" />
                      <button onClick={() => setDraft({ ...draft, channels: draft.channels.filter((_, j) => j !== i) })} className="p-1.5 text-smoke hover:text-blood" aria-label="Retirer">
                        <DynIcon name="x" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mb-2">
                {Object.entries(CHANNELS).map(([k, m]) => (
                  <button
                    key={k}
                    onClick={() => setNewChannel({ ...newChannel, kind: k })}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors"
                    style={newChannel.kind === k ? { borderColor: m.color, background: `${m.color}20`, color: "#e5e5e5" } : { borderColor: "#26262a", color: "#a3a3a3" }}
                  >
                    <DynIcon name={m.icon} className="w-3 h-3" style={{ color: m.color }} /> {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={CHANNELS[newChannel.kind]?.placeholder}
                  value={newChannel.value}
                  onChange={(e) => setNewChannel({ ...newChannel, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newChannel.value.trim()) {
                      setDraft({ ...draft, channels: [...draft.channels, { ...newChannel, value: newChannel.value.trim() }] });
                      setNewChannel({ ...newChannel, value: "" });
                    }
                  }}
                />
                <Btn
                  disabled={!newChannel.value.trim()}
                  onClick={() => {
                    setDraft({ ...draft, channels: [...draft.channels, { ...newChannel, value: newChannel.value.trim() }] });
                    setNewChannel({ ...newChannel, value: "" });
                  }}
                >
                  <DynIcon name="plus" className="w-3.5 h-3.5" /> {CHANNELS[newChannel.kind]?.short}
                </Btn>
              </div>
            </div>
          )}

          {/* Liens */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-smoke mb-1.5">Liens avec d&apos;autres personnes</div>
            <p className="text-[10px] text-smoke mb-2">À lire : « Léa est <em>la mère</em> de {draftName} ». Le sens compte pour l&apos;arbre (parent, grand-parent, oncle…).</p>
            {draft.links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {draft.links.map((l, i) => {
                  const o = byId.get(l.otherId);
                  if (!o) return null;
                  return (
                    <div key={l.otherId} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-[12px] text-ash w-28 truncate">{nameOf(o)}</span>
                      <span className="text-[10px] text-smoke">est</span>
                      <Select aria-label={`Relation de ${nameOf(o)}`} value={l.choice} onChange={(e) => setDraft({ ...draft, links: draft.links.map((x, j) => (j === i ? { ...x, choice: e.target.value } : x)) })} className="!py-1 !w-48">
                        <RelationOptions gender={o.gender} />
                      </Select>
                      <span className="text-[10px] text-smoke shrink-0">de {draftName}</span>
                      <Input placeholder="précision (facultatif)" maxLength={80} value={l.label} onChange={(e) => setDraft({ ...draft, links: draft.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className="!py-1" />
                      <button onClick={() => setDraft({ ...draft, links: draft.links.filter((_, j) => j !== i) })} className="p-1.5 text-smoke hover:text-blood" aria-label="Retirer">
                        <DynIcon name="x" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {linkCandidates.length > 0 ? (
              <div className="flex gap-2 flex-wrap sm:flex-nowrap items-center">
                <Select aria-label="Personne à lier" value={newLink.otherId} onChange={(e) => setNewLink({ ...newLink, otherId: e.target.value })}>
                  <option value="">Choisir une personne…</option>
                  {linkCandidates.map((p) => (
                    <option key={p.id} value={p.id}>{p.isSelf ? "Moi" : displayName(p)}{p.nickname ? ` (${p.nickname})` : ""}</option>
                  ))}
                </Select>
                <span className="text-[10px] text-smoke shrink-0">est</span>
                <Select aria-label="Relation" value={newLink.choice} onChange={(e) => setNewLink({ ...newLink, choice: e.target.value })} className="!w-48">
                  <RelationOptions gender={newLinkOther?.gender} />
                </Select>
                <Btn
                  disabled={!newLink.otherId}
                  onClick={() => {
                    setDraft({ ...draft, links: [...draft.links, { otherId: Number(newLink.otherId), choice: newLink.choice, label: newLink.label }] });
                    setNewLink({ otherId: "", choice: newLink.choice, label: "" });
                  }}
                >
                  <DynIcon name="plus" className="w-3.5 h-3.5" /> Lier
                </Btn>
              </div>
            ) : (
              <p className="text-[11px] text-smoke">{people.length <= 1 && !draft.id ? "Ajoute d'autres personnes pour créer des liens." : "Liée à tout le monde."}</p>
            )}
          </div>

          <Field label="Notes">
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Ce qui compte pour elle/lui, sujets en cours, cadeaux…" />
          </Field>

          <div className="flex justify-end gap-2">
            <Btn onClick={() => setFormOpen(false)}>Annuler</Btn>
            <Btn variant="primary" disabled={!draft.firstName.trim()} onClick={savePerson}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>

      {/* ===== TOAST ===== */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-6 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] rounded-xl border border-ember/40 bg-[#141416]/95 backdrop-blur px-4 py-2.5 text-[12px] text-ash shadow-lg"
            style={{ boxShadow: "0 0 24px rgba(245,158,11,0.2)" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
