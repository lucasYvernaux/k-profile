import type { Metadata } from "next";
import JournalScreen from "@/features/journal/components/JournalScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Bilan du jour" };

export default async function Page() {
  await requireUser();
  return <JournalScreen />;
}
