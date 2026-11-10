import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { quotes } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { ensureSeeded } from "@/features/progress/server/seed";
import { definedOnly } from "@/shared/lib/validation";
import type { CreateQuoteInput, UpdateQuoteInput } from "../manifesto.schemas";

const ANONYMOUS = "Anonyme";

const ownQuote = (quoteId: number) => and(eq(quotes.userId, currentUserId()), eq(quotes.id, quoteId));

export async function listQuotes() {
  await ensureSeeded();
  return getDb()
    .select()
    .from(quotes)
    .where(eq(quotes.userId, currentUserId()))
    .orderBy(asc(quotes.category), asc(quotes.id));
}

export async function createQuote(input: CreateQuoteInput) {
  const [row] = await getDb()
    .insert(quotes)
    .values({
      userId: currentUserId(),
      text: input.text,
      author: input.author || ANONYMOUS,
      source: input.source ?? null,
      character: input.character ?? null,
      isVerbatim: input.isVerbatim ?? true,
      category: input.category ?? "perso",
      isFavorite: input.isFavorite ?? false,
      isActive: input.isActive ?? true,
    })
    .returning();
  return row;
}

export async function updateQuote({ id, ...patch }: UpdateQuoteInput) {
  const values = definedOnly({ ...patch, author: patch.author === "" ? ANONYMOUS : patch.author });
  if (Object.keys(values).length) await getDb().update(quotes).set(values).where(ownQuote(id));
}

export async function deleteQuote(quoteId: number) {
  await getDb().delete(quotes).where(ownQuote(quoteId));
}
