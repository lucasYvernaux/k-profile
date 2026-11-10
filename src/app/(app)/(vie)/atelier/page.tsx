import type { Metadata } from "next";
import WorkshopScreen from "@/features/settings/components/WorkshopScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Atelier" };

export default async function Page() {
  await requireUser();
  return <WorkshopScreen />;
}
