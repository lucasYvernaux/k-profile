import { toCsv } from "@/lib/csv";
import { exportUserData } from "@/server/data/export";
import { apiUser, jsonError } from "@/server/http/guards";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const user = await apiUser(request);
  if (!user) {
    return jsonError(401, "Session requise.");
  }
  const url = new URL(request.url);
  const data = await exportUserData(user.id);
  const stamp = data.exportedAt.slice(0, 10);

  if (url.searchParams.get("format") === "csv") {
    const dataset = url.searchParams.get("dataset");
    const habitTitles = new Map(data.habits.map((habit) => [habit.id, habit.title]));
    const rows =
      dataset === "journal"
        ? data.journal.map((entry) => ({
            day: entry.day,
            emotion_1: entry.emotions[0],
            emotion_2: entry.emotions[1],
            emotion_3: entry.emotions[2],
            context: entry.context,
          }))
        : data.checkIns.map((checkIn) => ({ day: checkIn.day, habit: habitTitles.get(checkIn.habitId) ?? checkIn.habitId }));
    const name = dataset === "journal" ? "journal" : "habitudes";
    return new Response(toCsv(rows), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="k-${name}-${stamp}.csv"`,
      },
    });
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...NO_STORE,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="k-export-${stamp}.json"`,
    },
  });
}
