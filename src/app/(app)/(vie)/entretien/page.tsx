import type { Metadata } from "next";
import TimersScreen from "@/features/timers/components/TimersScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Entretien" };

export default async function Page() {
  await requireUser();
  return <TimersScreen />;
}
