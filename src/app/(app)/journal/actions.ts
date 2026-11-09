"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { deleteJournalEntry } from "@/server/data/entries";
import { requireAppContext } from "@/server/data/profile";

export async function deleteJournalEntryAction(form: FormData): Promise<void> {
  const { user } = await requireAppContext();
  await deleteJournalEntry(user.id, z.uuid().parse(form.get("entryId")));
  refresh();
}
