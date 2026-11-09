import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { interests, people, personInteractions, personInterests, personLinks } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { serverTodayKey } from "@/server/time";
import { createsAncestryCycle, isAncestry } from "../domain/kinship";
import { INNER_CIRCLE_MIN, INTERACTION_KINDS } from "../domain/network";
import type { ColdInput, CreatePersonInput, InteractionInput, LinkInput, PersonInput } from "../network.schemas";
import { completeCircleTimer } from "./circle";
import { purgeOrphanInterests, setPersonInterests } from "./interests.service";

/*
 * Personal network. Names, dates, notes and relationship kinds are sealed
 * (data about third parties), so sorting happens here, not in SQL.
 */

const MAX_INTERACTIONS = 2_000;
const DEFAULT_INTIMACY = 3;

const myPeople = () => eq(people.userId, currentUserId());
const ownPerson = (personId: number) => and(myPeople(), eq(people.id, personId));

export async function getNetwork() {
  const userId = currentUserId();
  const [rows, links, interactions, interestRows, personInterestRows] = await Promise.all([
    getDb().select().from(people).where(myPeople()),
    getDb().select().from(personLinks).where(eq(personLinks.userId, userId)),
    getDb()
      .select()
      .from(personInteractions)
      .where(eq(personInteractions.userId, userId))
      .orderBy(desc(personInteractions.date), desc(personInteractions.id))
      .limit(MAX_INTERACTIONS),
    getDb().select().from(interests).where(eq(interests.userId, userId)),
    getDb().select().from(personInterests).where(eq(personInterests.userId, userId)),
  ]);
  rows.sort((a, b) => b.intimacy - a.intimacy || a.firstName.localeCompare(b.firstName, "fr"));
  interestRows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return {
    people: rows,
    links,
    interactions,
    interests: interestRows,
    personInterests: personInterestRows,
    circleHabit: null,
  };
}

/** Full replacement of the editable fields (PUT semantics). */
function personValues(input: PersonInput) {
  const deceased = input.deceased ?? false;
  const coldSince = input.coldSince ?? null;
  return {
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    nickname: input.nickname ?? null,
    gender: input.gender ?? null,
    intimacy: input.intimacy ?? DEFAULT_INTIMACY,
    metAt: input.metAt ?? null,
    lastSeen: input.lastSeen ?? null,
    lastContact: input.lastContact ?? null,
    lastContactKind: input.lastContactKind ?? null,
    contactEveryDays: input.contactEveryDays ?? null,
    channels: input.channels?.length ? JSON.stringify(input.channels) : null,
    birthday: input.birthday ?? null,
    deceased,
    diedOn: deceased ? (input.diedOn ?? null) : null,
    coldSince,
    coldReason: coldSince ? (input.coldReason ?? null) : null,
    notes: input.notes ?? null,
  };
}

async function findPerson(personId: number) {
  return (await getDb().select().from(people).where(ownPerson(personId)).limit(1))[0];
}

export async function createPerson({ isSelf = false, ...input }: CreatePersonInput) {
  if (isSelf) {
    const existing = await getDb()
      .select({ id: people.id })
      .from(people)
      .where(and(myPeople(), eq(people.isSelf, true)))
      .limit(1);
    if (existing.length) throw conflict("Ta fiche « Moi » existe déjà");
  }
  const [row] = await getDb()
    .insert(people)
    .values({ ...personValues(input), userId: currentUserId(), isSelf })
    .returning();
  if (input.interests) await setPersonInterests(row.id, input.interests);
  return row;
}

export async function updatePerson(personId: number, input: PersonInput) {
  const updated = await getDb()
    .update(people)
    .set(personValues(input))
    .where(ownPerson(personId))
    .returning({ id: people.id });
  if (updated.length === 0) throw notFound("Personne introuvable");
  if (input.interests) await setPersonInterests(personId, input.interests);
  return { ok: true, id: personId };
}

/** Removes the person; links, interactions and interests cascade (foreign keys). */
export async function deletePerson(personId: number) {
  await getDb().transaction(async (tx) => {
    await tx.delete(people).where(ownPerson(personId));
    await purgeOrphanInterests(tx);
  });
}

/** Puts a relationship "on ice" (en froid), with an optional reason, or ends it. */
export async function setCold({ personId, cold, since, reason }: ColdInput) {
  const person = await findPerson(personId);
  if (!person) throw notFound("Personne introuvable");
  if (person.isSelf) throw badRequest("On ne peut pas être en froid avec soi-même");
  const patch = cold
    ? { coldSince: since ?? serverTodayKey(), coldReason: reason ?? null }
    : { coldSince: null, coldReason: null };
  await getDb().update(people).set(patch).where(ownPerson(personId));
  return { ok: true, ...patch };
}

/**
 * One link per pair: creates it or replaces its kind, label and direction.
 * For directed kinds, aId holds the upper role (aId is the parent of bId).
 */
export async function upsertLink(input: LinkInput) {
  const userId = currentUserId();
  const kind = input.kind ?? "amis";
  const label = input.label ?? null;
  const ends = await getDb()
    .select({ id: people.id })
    .from(people)
    .where(and(myPeople(), inArray(people.id, [input.aId, input.bId])));
  if (ends.length !== 2) throw notFound("Personne introuvable");

  const all = await getDb().select().from(personLinks).where(eq(personLinks.userId, userId));
  if (isAncestry(kind) && createsAncestryCycle(all, input.aId, input.bId)) {
    throw badRequest("Lien impossible : une personne deviendrait son propre ancêtre");
  }
  const existing = all.find(
    (l) => (l.aId === input.aId && l.bId === input.bId) || (l.aId === input.bId && l.bId === input.aId),
  );
  const values = { aId: input.aId, bId: input.bId, kind, label };
  if (existing) {
    await getDb()
      .update(personLinks)
      .set(values)
      .where(and(eq(personLinks.userId, userId), eq(personLinks.id, existing.id)));
    return { ...existing, ...values };
  }
  const [row] = await getDb()
    .insert(personLinks)
    .values({ ...values, userId })
    .returning();
  return row;
}

export async function deleteLink(linkId: number) {
  await getDb()
    .delete(personLinks)
    .where(and(eq(personLinks.userId, currentUserId()), eq(personLinks.id, linkId)));
}

/**
 * Logs a contact: updates "last seen" / "last contact", and for the inner
 * circle completes the circle upkeep timer.
 */
export async function logInteraction(input: InteractionInput) {
  const kind = input.kind ?? "autre";
  const date = input.date ?? serverTodayKey();
  const person = await findPerson(input.personId);
  if (!person) throw notFound("Personne introuvable");
  if (person.isSelf) throw badRequest("Impossible de noter un contact avec soi-même");

  await getDb()
    .insert(personInteractions)
    .values({ userId: person.userId, personId: person.id, date, kind, note: input.note ?? null });

  const patch: Partial<typeof people.$inferInsert> = {};
  if (INTERACTION_KINDS[kind]?.inPerson) {
    if (!person.lastSeen || date >= person.lastSeen) patch.lastSeen = date;
  } else if (!person.lastContact || date >= person.lastContact) {
    patch.lastContact = date;
    patch.lastContactKind = kind;
  }
  if (Object.keys(patch).length) await getDb().update(people).set(patch).where(ownPerson(person.id));

  let circleChecked = false;
  if (person.intimacy >= INNER_CIRCLE_MIN && date === serverTodayKey()) {
    circleChecked = await completeCircleTimer(date);
  }
  return { ok: true, circleChecked };
}

/** Deletes a history entry and recomputes the person's last dates from what remains. */
export async function deleteInteraction(interactionId: number) {
  const userId = currentUserId();
  const mine = and(eq(personInteractions.userId, userId), eq(personInteractions.id, interactionId));
  const row = (await getDb().select().from(personInteractions).where(mine).limit(1))[0];
  if (!row) return;
  await getDb().delete(personInteractions).where(mine);

  const rest = await getDb()
    .select()
    .from(personInteractions)
    .where(and(eq(personInteractions.userId, userId), eq(personInteractions.personId, row.personId)))
    .orderBy(desc(personInteractions.date), desc(personInteractions.id));
  const patch: Partial<typeof people.$inferInsert> = {};
  if (INTERACTION_KINDS[row.kind]?.inPerson) {
    patch.lastSeen = rest.find((r) => INTERACTION_KINDS[r.kind]?.inPerson)?.date ?? null;
  } else {
    const contact = rest.find((r) => !INTERACTION_KINDS[r.kind]?.inPerson);
    patch.lastContact = contact?.date ?? null;
    patch.lastContactKind = contact?.kind ?? null;
  }
  await getDb().update(people).set(patch).where(ownPerson(row.personId));
}

