import type { Metadata } from "next";
import MonthlyAuditScreen from "@/features/reviews/components/MonthlyAuditScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Audit mensuel" };

export default async function Page() {
  await requireUser();
  return <MonthlyAuditScreen />;
}
