import type { Metadata } from "next";
import RoutineScreen from "@/features/routine/components/RoutineScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Routine" };

export default async function Page() {
  await requireUser();
  return <RoutineScreen />;
}
