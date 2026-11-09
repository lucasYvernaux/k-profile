import "server-only";
import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { interests, people, personInterests } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { badRequest, notFound } from "@/server/http/errors";
import { interestKey, interestName, uniqueInterestNames } from "../domain/interests";
import type { UpdateInterestInput } from "../network.schemas";

/* Interests: one catalogue per user, each person picks some of them. */

type Executor = Pick<Database, "delete" | "insert" | "select" | "update">;

const myInterests = () => eq(interests.userId, currentUserId());

/** Interests nobody has any more disappear from the user's catalogue. */
function purgeOrphans(database: Executor = getDb()) {
  return database
    .delete(interests)
    .where(
      and(
        myInterests(),
        sql`not exists (select 1 from ${personInterests} where ${personInterests.userId} = ${interests.userId} and ${personInterests.interestId} = ${interests.id})`,
      ),
    );
}

/** Makes the person's interests exactly `names` (created on the fly, matched without case or accents). */
export async function setPersonInterests(personId: number, names: string[]) {
  const userId = currentUserId();
  const owner = await getDb()
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.id, personId)))
    .limit(1);
  if (owner.length === 0) throw notFound("Personne introuvable");

  const wanted = uniqueInterestNames(names);
  const keys = wanted.map(interestKey);
  await getDb().transaction(async (tx) => {
    if (keys.length) {
      await tx
        .insert(interests)
        .values(wanted.map((name) => ({ userId, name, key: interestKey(name) })))
        .onConflictDoNothing({ target: [interests.userId, interests.key] });
    }
    const ids = keys.length
      ? (await tx.select({ id: interests.id }).from(interests).where(and(myInterests(), inArray(interests.key, keys)))).map(
          (r) => r.id,
        )
      : [];
    const mine = and(eq(personInterests.userId, userId), eq(personInterests.personId, personId));
    await tx.delete(personInterests).where(ids.length ? and(mine, notInArray(personInterests.interestId, ids)) : mine);
    if (ids.length) {
      await tx
        .insert(personInterests)
        .values(ids.map((interestId) => ({ userId, personId, interestId })))
        .onConflictDoNothing();
    }
    await purgeOrphans(tx);
  });
}

/** Renames / recolours an interest. Renaming it like another interest merges both. */
export async function updateInterest({ id, name, color }: UpdateInterestInput) {
  const userId = currentUserId();
  const current = (await getDb().select().from(interests).where(and(myInterests(), eq(interests.id, id))).limit(1))[0];
  if (!current) throw notFound("Domaine introuvable");

  let targetId = id;
  if (name !== undefined) {
    const key = interestKey(name);
    if (!key) throw badRequest("Nom de domaine vide");
    const twin = (
      await getDb()
        .select()
        .from(interests)
        .where(and(myInterests(), eq(interests.key, key), ne(interests.id, id)))
        .limit(1)
    )[0];
    if (twin) {
      targetId = twin.id;
      await getDb().transaction(async (tx) => {
        const holders = await tx
          .select({ personId: personInterests.personId })
          .from(personInterests)
          .where(and(eq(personInterests.userId, userId), eq(personInterests.interestId, id)));
        if (holders.length) {
          await tx
            .insert(personInterests)
            .values(holders.map((h) => ({ userId, personId: h.personId, interestId: twin.id })))
            .onConflictDoNothing();
        }
        // person_interest rows of the old interest go with it (foreign key, cascade).
        await tx.delete(interests).where(and(myInterests(), eq(interests.id, id)));
      });
    } else {
      await getDb()
        .update(interests)
        .set({ name: interestName(name), key })
        .where(and(myInterests(), eq(interests.id, id)));
    }
  }
  if (color !== undefined) {
    await getDb().update(interests).set({ color }).where(and(myInterests(), eq(interests.id, targetId)));
  }
  return { ok: true, id: targetId, merged: targetId !== id };
}

/** Removes an interest from everyone (person_interest rows cascade). */
export async function deleteInterest(id: number) {
  await getDb().delete(interests).where(and(myInterests(), eq(interests.id, id)));
}

/** Called after a person is deleted. */
export function purgeOrphanInterests(database: Executor = getDb()) {
  return purgeOrphans(database);
}
