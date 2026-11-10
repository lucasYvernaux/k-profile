import { journalQuerySchema, saveJournalSchema } from "@/features/journal/journal.schemas";
import { getJournal, listJournals, saveJournal } from "@/features/journal/server/journal.service";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

/** With ?date: that day's journal (or null). Without: the most recent journals. */
export const GET = route({ query: journalQuerySchema }, ({ query }) =>
  query.date ? getJournal(query.date) : listJournals()
);

export const POST = route({ body: saveJournalSchema, maxBodyBytes: 256 * 1024 }, async ({ body }) => {
  await saveJournal(body);
});
