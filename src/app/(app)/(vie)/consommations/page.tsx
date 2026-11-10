import type { Metadata } from "next";
import IntakeScreen from "@/features/intake/components/IntakeScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Consommations" };

export default async function Page() {
  await requireUser();
  return <IntakeScreen />;
}
