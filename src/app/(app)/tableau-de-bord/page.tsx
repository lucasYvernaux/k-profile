import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PillarCards } from "@/components/pillar-cards";
import FadeContent from "@/shared/ui/react-bits/FadeContent";
import { ScoreCharts } from "@/components/score-charts";
import { VigilanceList } from "@/components/vigilance-list";
import { pendingReviewQuarter, scoreSeries } from "@/domain/review";
import { loadIndicators } from "@/server/data/dashboard";
import { requireAppContext } from "@/server/data/profile";
import { listReviews } from "@/server/data/progress";
import { loadVigilance } from "@/server/data/vigilance";

export const metadata: Metadata = { title: "Tableau de bord" };

async function Dashboard() {
  const { user, profile, today } = await requireAppContext();
  const [{ habits, checkIns, indicators }, reviews] = await Promise.all([
    loadIndicators(user.id, today),
    listReviews(user.id),
  ]);
  const signals = await loadVigilance(user.id, today, profile.programStart, habits, checkIns);
  const pending = pendingReviewQuarter(reviews.map((review) => review.quarter), profile.programStart, today);
  const latest = reviews[0];

  return (
    <>
      {pending && (
        <p className="notice">
          La revue du trimestre {pending} est à faire.{" "}
          <Link href="/revue" className="link">Commencer la revue</Link>
        </p>
      )}
      {/* The one motion of this screen: the grid comes into focus once. */}
      <FadeContent effect="focus" trigger="mount" duration={0.8} ease="power2.out">
        <PillarCards indicators={indicators} latestScores={latest?.scores} />
      </FadeContent>
      <section className="card flex flex-col gap-4" aria-labelledby="evolution-title">
        <h2 id="evolution-title" className="section-title">Évolution des notes trimestrielles</h2>
        <ScoreCharts series={scoreSeries(reviews)} />
      </section>
      <section className="card flex flex-col gap-4" aria-labelledby="signals-title">
        <h2 id="signals-title" className="section-title">Signaux de vigilance</h2>
        <VigilanceList signals={signals} />
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="page-title">Tableau de bord des 6 piliers</h1>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}
