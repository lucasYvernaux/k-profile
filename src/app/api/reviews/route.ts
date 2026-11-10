import { reviewsQueryInput, saveReviewSchema, type ReviewsQuery } from "@/features/reviews/reviews.schemas";
import { getReviews, saveMonthlyAudit, saveWeeklyReview } from "@/features/reviews/server/reviews.service";
import { route } from "@/server/http/route";
import type { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = route({ query: reviewsQueryInput as z.ZodType<ReviewsQuery> }, ({ query }) => getReviews(query));

export const POST = route({ body: saveReviewSchema, maxBodyBytes: 256 * 1024 }, async ({ body }) => {
  if (body.type === "monthly") await saveMonthlyAudit(body);
  else await saveWeeklyReview(body);
});
