import type { Metadata } from "next";
import ManifestoScreen from "@/features/manifesto/components/ManifestoScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Manifeste" };

export default async function Page() {
  await requireUser();
  return <ManifestoScreen />;
}
