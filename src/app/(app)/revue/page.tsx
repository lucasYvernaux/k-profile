import type { Metadata } from "next";
import { Suspense } from "react";
import { PillarCards } from "@/components/pillar-cards";
import { ScoreCharts } from "@/components/score-charts";
import { quarterKey } from "@/domain/dates";
import { pendingReviewQuarter, scoreSeries } from "@/domain/review";
import { loadIndicators } from "@/server/data/dashboard";
import { requireAppContext } from "@/server/data/profile";
import { listReviews } from "@/server/data/progress";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Revue trimestrielle" };

async function Review() {
  const { user, profile, today } = await requireAppContext();
  const [{ indicators }, reviews] = await Promise.all([loadIndicators(user.id, today), listReviews(user.id)]);
  const quarter = pendingReviewQuarter(reviews.map((review) => review.quarter), profile.programStart, today) ?? quarterKey(today);
  const existing = reviews.find((review) => review.quarter === quarter);

  return (
    <>
      <section className="card flex flex-col gap-4" aria-labelledby="form-title">
        <h2 id="form-title" className="section-title">
          {existing ? "Modifier" : "Faire"} la revue {quarter}
        </h2>
        <p>
          Commence par relire tes indicateurs ci-dessous, puis note chaque pilier honnêtement. Une note
          basse est une information, pas un jugement.
        </p>
        <ReviewForm key={quarter} quarter={quarter} existing={existing} />
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="indicators-title">
        <h2 id="indicators-title" className="section-title">Tes indicateurs actuels</h2>
        <PillarCards indicators={indicators} headingLevel={3} />
      </section>
      <section className="card flex flex-col gap-4" aria-labelledby="chart-title">
        <h2 id="chart-title" className="section-title">Évolution</h2>
        <ScoreCharts series={scoreSeries(reviews)} />
      </section>
    </>
  );
}

export default function ReviewPage() {
  return (
    <>
      <h1 className="page-title">Revue trimestrielle</h1>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Review />
      </Suspense>
    </>
  );
}
