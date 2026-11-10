import { createQuoteSchema, updateQuoteSchema } from "@/features/manifesto/manifesto.schemas";
import { createQuote, deleteQuote, listQuotes, updateQuote } from "@/features/manifesto/server/quotes.service";
import { route } from "@/server/http/route";
import { idQuery } from "@/shared/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route({}, () => listQuotes());

export const POST = route({ body: createQuoteSchema }, ({ body }) => createQuote(body));

export const PATCH = route({ body: updateQuoteSchema }, async ({ body }) => {
  await updateQuote(body);
});

export const DELETE = route({ query: idQuery }, async ({ query }) => {
  await deleteQuote(query.id);
});
