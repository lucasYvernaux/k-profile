import type { Metadata } from "next";
import HealthScreen from "@/features/health/components/HealthScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Santé" };

export default async function Page() {
  await requireUser();
  return <HealthScreen />;
}
