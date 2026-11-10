import type { Metadata } from "next";
import GoalsScreen from "@/features/goals/components/GoalsScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Objectifs" };

export default async function Page() {
  await requireUser();
  return <GoalsScreen />;
}
