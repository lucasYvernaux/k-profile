import type { Metadata } from "next";
import WeeklyReviewScreen from "@/features/reviews/components/WeeklyReviewScreen";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Revue hebdomadaire" };

export default async function Page() {
  await requireUser();
  return <WeeklyReviewScreen />;
}
