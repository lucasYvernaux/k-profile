import type { Metadata } from "next";
import NetworkScreen from "@/features/network/components/NetworkScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Réseau" };

export default async function Page() {
  await requireUser();
  return <NetworkScreen />;
}
