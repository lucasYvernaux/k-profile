"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Btn, Card, EmptyState, Input } from "@/shared/ui/primitives";
import { DynIcon } from "@/shared/ui/icon";
import { displayName, shortName, type Person } from "../domain/network";
import { INTEREST_COLORS, interestColor, interestKey, type Interest, type PersonInterest } from "../domain/interests";
import { Avatar, InterestChip } from "./PersonBits";

type Props = {
  people: Person[];
  interests: Interest[];
  personInterests: PersonInterest[];
  onOpen: (id: number) => void;
  onUpdate: (id: number, patch: { name?: string; color?: string | null }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

/** "Domaines" view: who likes what, at a glance. */
export function InterestsBoard({ people, interests, personInterests, onOpen, onUpdate, onDelete }: Props) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [editing, setEditing] = useState<{ id: number; name: string; confirm: boolean } | null>(null);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const peopleOf = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const pi of personInterests) {
      const p = byId.get(pi.personId);
      if (p) map.set(pi.interestId, [...(map.get(pi.interestId) ?? []), p]);
    }
    map.forEach((list) => list.sort((a, b) => b.intimacy - a.intimacy || displayName(a).localeCompare(displayName(b), "fr")));
    return map;
  }, [personInterests, byId]);

  const sorted = [...interests].sort((a, b) => (peopleOf.get(b.id)?.length ?? 0) - (peopleOf.get(a.id)?.length ?? 0) || a.name.localeCompare(b.name, "fr"));
  const needle = interestKey(q);
  const shown = sorted.filter((i) => !needle || i.key.includes(needle));

  // people sharing every picked domain
  const shared = picked.length
    ? people.filter((p) => picked.every((id) => peopleOf.get(id)?.some((x) => x.id === p.id)))
    : [];
  const withoutDomain = people.filter((p) => !p.isSelf && !personInterests.some((pi) => pi.personId === p.id));

  const toggle = (id: number) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  if (interests.length === 0) {
    return (
      <Card>
        <EmptyState icon="tags" title="Aucun domaine pour l'instant" sub="Ajoute des domaines (mangas, escalade, cuisine…) dans les fiches : tu verras ici qui aime quoi." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Croisement */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-smoke">Qui aime…</div>
            <p className="text-[11px] text-dust">Sélectionne un ou plusieurs domaines pour trouver les personnes qui les partagent.</p>
          </div>
          <div className="relative">
            <DynIcon name="search" className="w-3.5 h-3.5 text-smoke absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input placeholder="Chercher un domaine…" value={q} onChange={(e) => setQ(e.target.value)} className="!pl-8 !py-1.5 w-48" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((i) => (
            <InterestChip key={i.id} interest={i} count={peopleOf.get(i.id)?.length ?? 0} active={picked.includes(i.id)} onClick={() => toggle(i.id)} />
          ))}
        </div>
        {picked.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-ash">
                <span className="font-semibold">{shared.length}</span> personne{shared.length > 1 ? "s" : ""} :{" "}
                {picked.map((id) => interests.find((i) => i.id === id)?.name).join(" + ")}
              </p>
              <button onClick={() => setPicked([])} className="text-[10px] text-smoke hover:text-ash">Effacer</button>
            </div>
            {shared.length === 0 ? (
              <p className="text-[11px] text-smoke">Personne ne partage tous ces domaines.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {shared.map((p) => (
                  <button key={p.id} onClick={() => onOpen(p.id)} className="flex items-center gap-2 rounded-xl border border-line bg-[#131313] pl-1.5 pr-3 py-1.5 hover:border-line2">
                    <Avatar p={p} size={28} />
                    <span className="text-[12px] text-ash">{p.isSelf ? "Moi" : shortName(p)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Un bloc par domaine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.map((interest) => {
          const list = peopleOf.get(interest.id) ?? [];
          const color = interestColor(interest);
          const isEditing = editing?.id === interest.id;
          return (
            <motion.div key={interest.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card-frame p-4 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}88` }} />
                <p className="text-[14px] font-semibold text-ash flex-1 truncate">{interest.name}</p>
                <span className="text-[11px] font-semibold" style={{ color, fontFamily: "var(--font-mono-family)" }}>{list.length}</span>
                <button
                  onClick={() => setEditing(isEditing ? null : { id: interest.id, name: interest.name, confirm: false })}
                  className="p-1 rounded-md text-smoke hover:text-ash"
                  aria-label={`Modifier le domaine ${interest.name}`}
                >
                  <DynIcon name="pencil" className="w-3.5 h-3.5" />
                </button>
              </div>

              {isEditing && editing && (
                <div className="rounded-lg border border-line bg-[#121212] p-2.5 mb-3 space-y-2">
                  <div className="flex gap-1.5">
                    <Input aria-label={`Nouveau nom du domaine « ${interest.name} »`} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="!py-1" maxLength={40} />
                    <Btn
                      small
                      variant="primary"
                      disabled={!editing.name.trim() || editing.name.trim() === interest.name}
                      onClick={async () => { await onUpdate(interest.id, { name: editing.name.trim() }); setEditing(null); }}
                    >
                      OK
                    </Btn>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {INTEREST_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdate(interest.id, { color: c })}
                        className={`w-5 h-5 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
                        style={{ background: c }}
                        aria-label={`Couleur ${c}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end">
                    {editing.confirm ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-blood">Retirer « {interest.name} » de {list.length} fiche{list.length > 1 ? "s" : ""} ?</span>
                        <Btn small onClick={() => setEditing({ ...editing, confirm: false })}>Non</Btn>
                        <Btn small variant="danger" onClick={async () => { await onDelete(interest.id); setEditing(null); setPicked((x) => x.filter((id) => id !== interest.id)); }}>Oui</Btn>
                      </div>
                    ) : (
                      <button onClick={() => setEditing({ ...editing, confirm: true })} className="text-[10px] text-smoke hover:text-blood">Supprimer le domaine</button>
                    )}
                  </div>
                  <p className="text-[9.5px] text-smoke">Renommer un domaine comme un autre fusionne les deux.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {list.map((p) => (
                  <button key={p.id} onClick={() => onOpen(p.id)} className="flex items-center gap-1.5 rounded-full border border-line bg-[#131313] pl-0.5 pr-2.5 py-0.5 hover:border-line2">
                    <Avatar p={p} size={22} decorative />
                    <span className="text-[11px] text-ash">{p.isSelf ? "Moi" : shortName(p)}</span>
                    {!p.isSelf && displayName(p) !== shortName(p) && <span className="sr-only">, {displayName(p)}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
      {shown.length === 0 && <EmptyState icon="search" title="Aucun domaine ne correspond" />}

      {withoutDomain.length > 0 && (
        <p className="text-[10px] text-smoke">
          Sans domaine : {withoutDomain.slice(0, 12).map((p) => shortName(p)).join(", ")}
          {withoutDomain.length > 12 ? ` et ${withoutDomain.length - 12} autres` : ""}.
        </p>
      )}
    </div>
  );
}
