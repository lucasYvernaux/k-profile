/**
 * One-shot data migration NYX-KAIROS → K (ADR 0010).
 *
 * Copies every NYX table into the "life" tables of one K account, encrypting
 * the sealed columns with that account's data key.
 *
 *   NYX_DATABASE_URL="postgresql://…nyx…" pnpm migrate:nyx --email you@example.com           # dry run
 *   NYX_DATABASE_URL="postgresql://…nyx…" pnpm migrate:nyx --email you@example.com --apply   # writes
 *
 * Target database and secrets come from .env.local (DATABASE_URL_UNPOOLED or
 * DATABASE_URL, DATA_ENCRYPTION_KEY, BETTER_AUTH_SECRET, BETTER_AUTH_URL).
 *
 * Safety:
 * - the NYX database is opened in a READ ONLY transaction: it cannot be modified;
 * - dry run by default; --apply writes everything in one transaction (all or nothing);
 * - refuses to run when the account already holds personal life data; default
 *   data seeded by the app (routine, upkeep timers, quotes, badges) is replaced;
 * - NYX habits become K habits "en pause" (they do not count in the 2 habits in
 *   formation) with their completed days as check-ins.
 */
import { config } from "dotenv";
import { and, count, eq, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../src/server/db/schema";
import { userDataScope } from "../src/server/crypto/sealed-columns";
import { userCipher } from "../src/server/crypto/user-data";
import { DEFAULT_ACHIEVEMENTS } from "../src/shared/domain/constants";
import { camelize, lastByKey, mapHabitCadence, mapPillar, mapPillarScores } from "./nyx/mapping";

config({ path: ".env.local", quiet: true });

type Row = Record<string, unknown> & { id: number };

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback);
const date = (v: unknown): Date | undefined => (v instanceof Date ? v : undefined);

async function readSource(url: string) {
  const source = new Client({ connectionString: url });
  await source.connect();
  await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const read = async (table: string, order = "id"): Promise<Row[]> => {
    try {
      const result = await source.query(`select * from "${table}" order by "${order}"`);
      return result.rows.map((row) => camelize(row) as Row);
    } catch (error) {
      // 42P01: the table does not exist in this NYX version.
      if ((error as { code?: string }).code === "42P01") return [];
      throw error;
    }
  };
  try {
    return {
      settings: await read("settings", "key"),
      habits: await read("habits"),
      habitEntries: await read("habit_entries"),
      phaseDefs: await read("phase_defs"),
      phaseEntries: await read("phase_entries"),
      timers: await read("timers"),
      timerHistory: await read("timer_history"),
      intakeLogs: await read("intake_logs"),
      bodyMetrics: await read("body_metrics"),
      workouts: await read("workouts"),
      journalEntries: await read("journal_entries"),
      emotionLogs: await read("emotion_logs"),
      weeklyReviews: await read("weekly_reviews"),
      monthlyAudits: await read("monthly_audits"),
      goals: await read("goals"),
      projects: await read("projects"),
      skills: await read("skills"),
      quotes: await read("quotes"),
      people: await read("people"),
      personLinks: await read("person_links"),
      personInteractions: await read("person_interactions"),
      interests: await read("interests"),
      personInterests: await read("person_interests"),
      achievements: await read("achievements"),
      dailyScores: await read("daily_scores"),
    };
  } finally {
    await source.query("ROLLBACK");
    await source.end();
  }
}

type Source = Awaited<ReturnType<typeof readSource>>;

/** Tables holding personal data typed by the user: they must be empty on the target. */
const PERSONAL_TABLES = [
  schema.people,
  schema.intakeLogs,
  schema.bodyMetrics,
  schema.workouts,
  schema.logbookEntries,
  schema.emotionLogs,
  schema.goals,
  schema.projects,
  schema.weeklyReviews,
  schema.monthlyAudits,
] as const;

async function main() {
  const email = argument("--email");
  const apply = process.argv.includes("--apply");
  const sourceUrl = process.env.NYX_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!email || !sourceUrl || !targetUrl) {
    throw new Error("Usage: NYX_DATABASE_URL=… pnpm migrate:nyx --email <K account email> [--apply]");
  }
  if (sourceUrl === targetUrl) throw new Error("NYX_DATABASE_URL must differ from the K database");

  const nyx = await readSource(sourceUrl);
  console.log("NYX rows read:");
  console.table(Object.fromEntries(Object.entries(nyx).map(([table, rows]) => [table, rows.length])));

  const target = new Client({ connectionString: targetUrl });
  await target.connect();
  const db = drizzle({ client: target, schema, casing: "snake_case" });
  try {
    const account = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
    if (!account) throw new Error(`No K account with this email`);
    for (const table of PERSONAL_TABLES) {
      const [{ n }] = await db.select({ n: count() }).from(table).where(eq(table.userId, account.id));
      if (n > 0) throw new Error("The K account already holds life data: refusing to mix two histories");
    }
    if (!apply) {
      console.log("Dry run: nothing written. Add --apply to migrate.");
      return;
    }
    const codec = await userCipher(account.id);
    await userDataScope.run({ userId: account.id, codec }, () => migrate(db, account.id, nyx));
    console.log("Migration done.");
  } finally {
    await target.end();
  }
}

type Db = ReturnType<typeof drizzle<typeof schema, Client>>;

async function migrate(db: Db, userId: string, nyx: Source) {
  await db.transaction(async (tx) => {
    // Defaults seeded by the app on first visit are replaced by the NYX data.
    for (const table of [
      schema.phaseEntries,
      schema.phaseDefs,
      schema.timers,
      schema.quotes,
      schema.achievements,
      schema.dailyScores,
      schema.userSettings,
      schema.interests,
      schema.skills,
    ] as const) {
      await tx.delete(table).where(eq(table.userId, userId));
    }

    const insertAll = async <T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) => {
      for (let i = 0; i < rows.length; i += 500) await insert(rows.slice(i, i + 500));
    };

    /* Settings */
    await insertAll(nyx.settings, (chunk) =>
      tx.insert(schema.userSettings).values(chunk.map((s) => ({ userId, key: String(s.key), value: String(s.value) }))),
    );

    /* Routine */
    await insertAll(nyx.phaseDefs, (chunk) =>
      tx.insert(schema.phaseDefs).values(
        chunk.map((p) => ({
          userId,
          key: String(p.key),
          title: String(p.title),
          startTime: String(p.startTime),
          endTime: String(p.endTime),
          icon: str(p.icon) ?? "flame",
          pillar: mapPillar(p.pillar),
          daysOfWeek: str(p.daysOfWeek),
          isActive: bool(p.isActive, true),
          sortOrder: num(p.sortOrder) ?? 0,
        })),
      ),
    );
    await insertAll(
      lastByKey(nyx.phaseEntries, (e) => `${e.date}|${e.phaseKey}`),
      (chunk) =>
        tx.insert(schema.phaseEntries).values(
          chunk.map((e) => ({
            userId,
            date: String(e.date),
            phaseKey: String(e.phaseKey),
            status: String(e.status),
            notes: str(e.notes),
          })),
        ),
    );

    /* Upkeep timers */
    const timerIds = new Map<number, number>();
    for (const t of nyx.timers) {
      const [row] = await tx
        .insert(schema.timers)
        .values({
          userId,
          name: String(t.name),
          description: str(t.description),
          icon: str(t.icon) ?? "timer",
          category: str(t.category) ?? "maison",
          frequencyDays: num(t.frequencyDays) ?? 7,
          lastDone: str(t.lastDone),
          nextDue: str(t.nextDue),
          isActive: bool(t.isActive, true),
          createdAt: date(t.createdAt),
        })
        .returning({ id: schema.timers.id });
      timerIds.set(t.id, row.id);
    }
    const history = nyx.timerHistory.filter((h) => timerIds.has(Number(h.timerId)));
    await insertAll(history, (chunk) =>
      tx.insert(schema.timerHistory).values(
        chunk.map((h) => ({
          userId,
          timerId: timerIds.get(Number(h.timerId)) as number,
          completedAt: String(h.completedAt),
          notes: str(h.notes),
        })),
      ),
    );

    /* Intake and health */
    await insertAll(nyx.intakeLogs, (chunk) =>
      tx.insert(schema.intakeLogs).values(
        chunk.map((l) => ({
          userId,
          date: String(l.date),
          kind: String(l.kind),
          amount: num(l.amount) ?? 0,
          label: str(l.label),
          volumeCl: num(l.volumeCl),
          abv: num(l.abv),
          grams: num(l.grams),
          hour: num(l.hour) ?? 12,
          minute: num(l.minute) ?? 0,
          createdAt: date(l.createdAt),
        })),
      ),
    );
    await insertAll(nyx.bodyMetrics, (chunk) =>
      tx.insert(schema.bodyMetrics).values(
        chunk.map((m) => ({
          userId,
          date: String(m.date),
          weightKg: num(m.weightKg),
          heightCm: num(m.heightCm),
          bodyFatPct: num(m.bodyFatPct),
          neck: num(m.neck),
          shoulders: num(m.shoulders),
          chest: num(m.chest),
          waist: num(m.waist),
          hips: num(m.hips),
          arm: num(m.arm),
          forearm: num(m.forearm),
          thigh: num(m.thigh),
          calf: num(m.calf),
          notes: str(m.notes),
          createdAt: date(m.createdAt),
        })),
      ),
    );
    await insertAll(nyx.workouts, (chunk) =>
      tx.insert(schema.workouts).values(
        chunk.map((w) => ({
          userId,
          date: String(w.date),
          type: str(w.type) ?? "autre",
          title: str(w.title),
          durationMin: num(w.durationMin),
          intensity: num(w.intensity),
          calories: num(w.calories),
          distanceKm: num(w.distanceKm),
          exercises: str(w.exercises),
          notes: str(w.notes),
          createdAt: date(w.createdAt),
        })),
      ),
    );

    /* Logbook and emotions */
    await insertAll(
      lastByKey(nyx.journalEntries, (j) => String(j.date)),
      (chunk) =>
        tx.insert(schema.logbookEntries).values(
          chunk.map((j) => ({
            userId,
            date: String(j.date),
            mood: num(j.mood),
            energy: num(j.energy),
            focus: num(j.focus),
            wins: str(j.wins),
            losses: str(j.losses),
            distractions: str(j.distractions),
            emotionsNote: str(j.emotionsNote),
            improvements: str(j.improvements),
            violatedRules: str(j.violatedRules),
            trapsHit: str(j.trapsHit),
            notes: str(j.notes),
            createdAt: date(j.createdAt),
          })),
        ),
    );
    await insertAll(nyx.emotionLogs, (chunk) =>
      tx.insert(schema.emotionLogs).values(
        chunk.map((e) => ({
          userId,
          emotion: String(e.emotion),
          intensity: num(e.intensity) ?? 5,
          triggerText: str(e.triggerText),
          reaction: str(e.reaction),
          idealReaction: str(e.idealReaction),
          date: String(e.date),
          hour: num(e.hour) ?? 12,
          createdAt: date(e.createdAt),
        })),
      ),
    );

    /* Reviews */
    await insertAll(
      lastByKey(nyx.weeklyReviews, (r) => String(r.weekStart)),
      (chunk) =>
        tx.insert(schema.weeklyReviews).values(
          chunk.map((r) => ({
            userId,
            weekStart: String(r.weekStart),
            mondayPlanned: bool(r.mondayPlanned),
            fridayCreated: str(r.fridayCreated),
            fridayDone: bool(r.fridayDone),
            saturdayCircle: bool(r.saturdayCircle),
            sundayReview: bool(r.sundayReview),
            biggestWin: str(r.biggestWin),
            biggestFail: str(r.biggestFail),
            learned: str(r.learned),
            violatedRules: str(r.violatedRules),
            trapsHit: str(r.trapsHit),
            nextWeekGoal: str(r.nextWeekGoal),
            focusPillar: mapPillar(r.focusPillar),
            overallMood: num(r.overallMood),
            notes: str(r.notes),
            createdAt: date(r.createdAt),
          })),
        ),
    );
    await insertAll(
      lastByKey(nyx.monthlyAudits, (r) => String(r.month)),
      (chunk) =>
        tx.insert(schema.monthlyAudits).values(
          chunk.map((r) => ({
            userId,
            month: String(r.month),
            challenge: str(r.challenge),
            skillDeveloped: str(r.skillDeveloped),
            circleNurtured: str(r.circleNurtured),
            financialProgress: str(r.financialProgress),
            limitsDestroyed: str(r.limitsDestroyed),
            deathAndRebirth: str(r.deathAndRebirth),
            pillarScores: mapPillarScores(r.pillarScores),
            nextMonthGoals: str(r.nextMonthGoals),
            createdAt: date(r.createdAt),
          })),
        ),
    );

    /* Goals, projects, skills, quotes */
    await insertAll(nyx.goals, (chunk) =>
      tx.insert(schema.goals).values(
        chunk.map((g) => ({
          userId,
          title: String(g.title),
          description: str(g.description),
          level: num(g.level) ?? 1,
          pillar: mapPillar(g.pillar),
          deadline: str(g.deadline),
          subGoals: str(g.subGoals),
          completion: num(g.completion) ?? 0,
          status: str(g.status) ?? "active",
          createdAt: date(g.createdAt),
        })),
      ),
    );
    await insertAll(nyx.projects, (chunk) =>
      tx.insert(schema.projects).values(
        chunk.map((p) => ({
          userId,
          name: String(p.name),
          description: str(p.description),
          pillar: mapPillar(p.pillar),
          startDate: str(p.startDate),
          endDate: str(p.endDate),
          milestones: str(p.milestones),
          journal: str(p.journal),
          completion: num(p.completion) ?? 0,
          status: str(p.status) ?? "active",
          createdAt: date(p.createdAt),
        })),
      ),
    );
    await insertAll(nyx.skills, (chunk) =>
      tx.insert(schema.skills).values(
        chunk.map((s) => ({
          userId,
          name: String(s.name),
          category: str(s.category) ?? "mentale",
          level: str(s.level) ?? "debutant",
          hoursInvested: num(s.hoursInvested) ?? 0,
          resources: str(s.resources),
          nextStep: str(s.nextStep),
          createdAt: date(s.createdAt),
        })),
      ),
    );
    await insertAll(nyx.quotes, (chunk) =>
      tx.insert(schema.quotes).values(
        chunk.map((q) => ({
          userId,
          text: String(q.text),
          author: str(q.author) ?? "Anonyme",
          source: str(q.source),
          character: str(q.character),
          isVerbatim: bool(q.isVerbatim, true),
          category: str(q.category) ?? "perso",
          isFavorite: bool(q.isFavorite),
          isActive: bool(q.isActive, true),
          createdAt: date(q.createdAt),
        })),
      ),
    );

    /* Network */
    const personIds = new Map<number, number>();
    for (const p of nyx.people) {
      const [row] = await tx
        .insert(schema.people)
        .values({
          userId,
          firstName: String(p.firstName),
          lastName: str(p.lastName),
          nickname: str(p.nickname),
          gender: str(p.gender),
          isSelf: bool(p.isSelf),
          intimacy: num(p.intimacy) ?? 3,
          metAt: str(p.metAt),
          lastSeen: str(p.lastSeen),
          lastContact: str(p.lastContact),
          lastContactKind: str(p.lastContactKind),
          contactEveryDays: num(p.contactEveryDays),
          channels: str(p.channels),
          birthday: str(p.birthday),
          deceased: bool(p.deceased),
          diedOn: str(p.diedOn),
          coldSince: str(p.coldSince),
          coldReason: str(p.coldReason),
          notes: str(p.notes),
          createdAt: date(p.createdAt),
        })
        .returning({ id: schema.people.id });
      personIds.set(p.id, row.id);
    }
    const links = nyx.personLinks.filter((l) => personIds.has(Number(l.aId)) && personIds.has(Number(l.bId)));
    await insertAll(links, (chunk) =>
      tx.insert(schema.personLinks).values(
        chunk.map((l) => ({
          userId,
          aId: personIds.get(Number(l.aId)) as number,
          bId: personIds.get(Number(l.bId)) as number,
          kind: str(l.kind) ?? "amis",
          label: str(l.label),
        })),
      ),
    );
    const interactions = nyx.personInteractions.filter((i) => personIds.has(Number(i.personId)));
    await insertAll(interactions, (chunk) =>
      tx.insert(schema.personInteractions).values(
        chunk.map((i) => ({
          userId,
          personId: personIds.get(Number(i.personId)) as number,
          date: String(i.date),
          kind: str(i.kind) ?? "autre",
          note: str(i.note),
          createdAt: date(i.createdAt),
        })),
      ),
    );
    const interestIds = new Map<number, number>();
    for (const i of nyx.interests) {
      const [row] = await tx
        .insert(schema.interests)
        .values({ userId, name: String(i.name), key: String(i.key), color: str(i.color), createdAt: date(i.createdAt) })
        .onConflictDoNothing({ target: [schema.interests.userId, schema.interests.key] })
        .returning({ id: schema.interests.id });
      if (row) interestIds.set(i.id, row.id);
    }
    const picks = nyx.personInterests.filter(
      (pi) => personIds.has(Number(pi.personId)) && interestIds.has(Number(pi.interestId)),
    );
    await insertAll(picks, (chunk) =>
      tx
        .insert(schema.personInterests)
        .values(
          chunk.map((pi) => ({
            userId,
            personId: personIds.get(Number(pi.personId)) as number,
            interestId: interestIds.get(Number(pi.interestId)) as number,
          })),
        )
        .onConflictDoNothing(),
    );

    /* Gamification history */
    const unlocked = new Map(
      nyx.achievements.filter((a) => a.isUnlocked === true).map((a) => [String(a.code), str(a.unlockedAt)]),
    );
    await tx.insert(schema.achievements).values(
      DEFAULT_ACHIEVEMENTS.map((a) => ({
        ...a,
        userId,
        isUnlocked: unlocked.has(a.code),
        unlockedAt: unlocked.get(a.code) ?? null,
      })),
    );
    await insertAll(
      lastByKey(nyx.dailyScores, (s) => String(s.date)),
      (chunk) =>
        tx.insert(schema.dailyScores).values(
          chunk.map((s) => ({
            userId,
            date: String(s.date),
            score: num(s.score) ?? 0,
            habitsCompleted: num(s.habitsCompleted) ?? 0,
            habitsTotal: num(s.habitsTotal) ?? 0,
            phasesCompleted: num(s.phasesCompleted) ?? 0,
            phasesTotal: num(s.phasesTotal) ?? 0,
            xpEarned: num(s.xpEarned) ?? 0,
          })),
        ),
    );

    /* NYX habits → K habits "en pause", completed days → check-ins */
    const [{ last }] = await tx
      .select({ last: max(schema.habit.queueOrder) })
      .from(schema.habit)
      .where(eq(schema.habit.userId, userId));
    let queueOrder = last ?? 0;
    for (const h of nyx.habits) {
      const pillar = mapPillar(h.pillar);
      if (!pillar) continue;
      const { cadence, timesPerWeek } = mapHabitCadence(h.frequency, h.timesPerWeek);
      queueOrder += 1;
      const [row] = await tx
        .insert(schema.habit)
        .values({ userId, title: String(h.name).slice(0, 80), pillar, cadence, timesPerWeek, status: "paused", queueOrder })
        .returning({ id: schema.habit.id });
      const days = [
        ...new Set(nyx.habitEntries.filter((e) => Number(e.habitId) === h.id && e.completed === true).map((e) => String(e.date))),
      ];
      await insertAll(days, (chunk) =>
        tx
          .insert(schema.habitCheckIn)
          .values(chunk.map((day) => ({ habitId: row.id, userId, day })))
          .onConflictDoNothing(),
      );
    }

    const [{ n }] = await tx
      .select({ n: count() })
      .from(schema.people)
      .where(and(eq(schema.people.userId, userId)));
    console.log(`Written: ${n} people, ${nyx.habits.length} habits (paused), ${nyx.intakeLogs.length} intake rows…`);
  });
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
