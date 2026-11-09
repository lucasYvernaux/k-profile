import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sealed } from "../crypto/sealed-columns";
import { user } from "./auth-schema";

/*
 * "Life" modules merged from NYX-KAIROS (ADR 0010): routine, upkeep timers,
 * intake, health, network, logbook, reviews, goals, manifesto, gamification.
 *
 * - Every row belongs to a user (`user_id`, cascade on account deletion).
 * - Children reference their parent through (user_id, parent_id), so a row can
 *   never point to another user's data, even after an application bug.
 * - `sealed()` columns hold per-user AES-256-GCM ciphertext. They are never
 *   compared or sorted in SQL. Plain columns hold only what queries need
 *   (ids, dates, kinds, flags).
 * - Business dates are "YYYY-MM-DD" strings in the user's time zone.
 */

const ownerId = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const id = () => integer().primaryKey().generatedByDefaultAsIdentity();
const createdAt = () => timestamp({ withTimezone: true }).defaultNow().notNull();

/* Settings (JSON per feature, e.g. intake limits, gamification switch) -- */

export const userSettings = pgTable(
  "user_setting",
  {
    userId: ownerId(),
    key: text().notNull(),
    value: sealed<string>("life:user_setting.value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

/* Routine: phases of the typical day and their daily completion -------- */

export const phaseDefs = pgTable(
  "routine_phase",
  {
    id: id(),
    userId: ownerId(),
    key: text().notNull(),
    title: text().notNull(),
    startTime: text().notNull(),
    endTime: text().notNull(),
    icon: text().notNull().default("flame"),
    pillar: text(),
    /** JSON number[] 0-6 (0 = Sunday). NULL = every day. */
    daysOfWeek: text(),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [uniqueIndex("routine_phase_user_key_idx").on(t.userId, t.key)],
);

export const phaseEntries = pgTable(
  "routine_check",
  {
    id: id(),
    userId: ownerId(),
    date: text().notNull(),
    phaseKey: text().notNull(),
    status: text().notNull(), // completed | skipped | missed
    notes: sealed<string>("life:routine_check.notes"),
  },
  (t) => [uniqueIndex("routine_check_user_day_phase_idx").on(t.userId, t.date, t.phaseKey)],
);

/* Upkeep timers (recurring household, health and admin tasks) ---------- */

export const timers = pgTable(
  "upkeep_timer",
  {
    id: id(),
    userId: ownerId(),
    name: text().notNull(),
    description: text(),
    icon: text().default("timer"),
    category: text().notNull().default("maison"),
    frequencyDays: integer().notNull(),
    lastDone: text(),
    nextDue: text(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [unique("upkeep_timer_user_id_key").on(t.userId, t.id)],
);

export const timerHistory = pgTable(
  "upkeep_done",
  {
    id: id(),
    userId: ownerId(),
    timerId: integer().notNull(),
    completedAt: text().notNull(),
    notes: text(),
  },
  (t) => [
    foreignKey({ columns: [t.userId, t.timerId], foreignColumns: [timers.userId, timers.id] }).onDelete("cascade"),
    index("upkeep_done_user_timer_idx").on(t.userId, t.timerId),
  ],
);

/* Intake: water, caffeine, alcohol (health data: amounts are sealed) --- */

export const intakeLogs = pgTable(
  "intake_log",
  {
    id: id(),
    userId: ownerId(),
    date: text().notNull(),
    kind: text().notNull(), // water | alcohol | caffeine
    amount: sealed<number>("life:intake_log.amount").notNull(),
    label: sealed<string>("life:intake_log.label"),
    /** Alcohol, as on the label: volume in cL and % vol. */
    volumeCl: sealed<number>("life:intake_log.volume_cl"),
    abv: sealed<number>("life:intake_log.abv"),
    /** Grams of pure alcohol (computed). */
    grams: sealed<number>("life:intake_log.grams"),
    hour: integer().notNull().default(12),
    minute: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("intake_log_user_date_idx").on(t.userId, t.date)],
);

/* Health: body metrics and workouts (special category data: sealed) ---- */

export const bodyMetrics = pgTable(
  "body_metric",
  {
    id: id(),
    userId: ownerId(),
    date: text().notNull(),
    weightKg: sealed<number>("life:body_metric.weight_kg"),
    heightCm: sealed<number>("life:body_metric.height_cm"),
    bodyFatPct: sealed<number>("life:body_metric.body_fat_pct"),
    neck: sealed<number>("life:body_metric.neck"),
    shoulders: sealed<number>("life:body_metric.shoulders"),
    chest: sealed<number>("life:body_metric.chest"),
    waist: sealed<number>("life:body_metric.waist"),
    hips: sealed<number>("life:body_metric.hips"),
    arm: sealed<number>("life:body_metric.arm"),
    forearm: sealed<number>("life:body_metric.forearm"),
    thigh: sealed<number>("life:body_metric.thigh"),
    calf: sealed<number>("life:body_metric.calf"),
    notes: sealed<string>("life:body_metric.notes"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("body_metric_user_date_idx").on(t.userId, t.date)],
);

export const workouts = pgTable(
  "workout",
  {
    id: id(),
    userId: ownerId(),
    date: text().notNull(),
    type: text().notNull().default("muscu"),
    title: sealed<string>("life:workout.title"),
    durationMin: sealed<number>("life:workout.duration_min"),
    /** Rate of perceived exertion, 1-10. */
    intensity: sealed<number>("life:workout.intensity"),
    calories: sealed<number>("life:workout.calories"),
    distanceKm: sealed<number>("life:workout.distance_km"),
    /** JSON [{name, sets, reps, weight}] */
    exercises: sealed<string>("life:workout.exercises"),
    notes: sealed<string>("life:workout.notes"),
    createdAt: createdAt(),
  },
  (t) => [index("workout_user_date_idx").on(t.userId, t.date)],
);

/* Logbook: daily self-assessment and detailed emotion logs ------------- */

export const logbookEntries = pgTable(
  "logbook_entry",
  {
    id: id(),
    userId: ownerId(),
    date: text().notNull(),
    mood: sealed<number>("life:logbook_entry.mood"),
    energy: sealed<number>("life:logbook_entry.energy"),
    focus: sealed<number>("life:logbook_entry.focus"),
    wins: sealed<string>("life:logbook_entry.wins"),
    losses: sealed<string>("life:logbook_entry.losses"),
    distractions: sealed<string>("life:logbook_entry.distractions"),
    emotionsNote: sealed<string>("life:logbook_entry.emotions_note"),
    improvements: sealed<string>("life:logbook_entry.improvements"),
    /** JSON string[] */
    violatedRules: sealed<string>("life:logbook_entry.violated_rules"),
    /** JSON string[] */
    trapsHit: sealed<string>("life:logbook_entry.traps_hit"),
    notes: sealed<string>("life:logbook_entry.notes"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("logbook_entry_user_date_idx").on(t.userId, t.date)],
);

export const emotionLogs = pgTable(
  "emotion_log",
  {
    id: id(),
    userId: ownerId(),
    emotion: sealed<string>("life:emotion_log.emotion").notNull(),
    intensity: sealed<number>("life:emotion_log.intensity").notNull(),
    triggerText: sealed<string>("life:emotion_log.trigger_text"),
    reaction: sealed<string>("life:emotion_log.reaction"),
    idealReaction: sealed<string>("life:emotion_log.ideal_reaction"),
    date: text().notNull(),
    hour: integer().notNull().default(12),
    createdAt: createdAt(),
  },
  (t) => [index("emotion_log_user_date_idx").on(t.userId, t.date)],
);

/* Weekly reviews and monthly audits ------------------------------------ */

export const weeklyReviews = pgTable(
  "weekly_review",
  {
    id: id(),
    userId: ownerId(),
    /** Monday, YYYY-MM-DD */
    weekStart: text().notNull(),
    mondayPlanned: boolean().default(false),
    fridayCreated: sealed<string>("life:weekly_review.friday_created"),
    fridayDone: boolean().default(false),
    saturdayCircle: boolean().default(false),
    sundayReview: boolean().default(false),
    biggestWin: sealed<string>("life:weekly_review.biggest_win"),
    biggestFail: sealed<string>("life:weekly_review.biggest_fail"),
    learned: sealed<string>("life:weekly_review.learned"),
    violatedRules: sealed<string>("life:weekly_review.violated_rules"),
    trapsHit: sealed<string>("life:weekly_review.traps_hit"),
    nextWeekGoal: sealed<string>("life:weekly_review.next_week_goal"),
    focusPillar: text(),
    overallMood: sealed<number>("life:weekly_review.overall_mood"),
    notes: sealed<string>("life:weekly_review.notes"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("weekly_review_user_week_idx").on(t.userId, t.weekStart)],
);

export const monthlyAudits = pgTable(
  "monthly_audit",
  {
    id: id(),
    userId: ownerId(),
    /** YYYY-MM */
    month: text().notNull(),
    challenge: sealed<string>("life:monthly_audit.challenge"),
    skillDeveloped: sealed<string>("life:monthly_audit.skill_developed"),
    circleNurtured: sealed<string>("life:monthly_audit.circle_nurtured"),
    financialProgress: sealed<string>("life:monthly_audit.financial_progress"),
    limitsDestroyed: sealed<string>("life:monthly_audit.limits_destroyed"),
    deathAndRebirth: sealed<string>("life:monthly_audit.death_and_rebirth"),
    /** JSON {pillar: 1-10} */
    pillarScores: sealed<string>("life:monthly_audit.pillar_scores"),
    nextMonthGoals: sealed<string>("life:monthly_audit.next_month_goals"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("monthly_audit_user_month_idx").on(t.userId, t.month)],
);

/* Goals, projects and skills ------------------------------------------- */

export const goals = pgTable(
  "goal",
  {
    id: id(),
    userId: ownerId(),
    title: sealed<string>("life:goal.title").notNull(),
    description: sealed<string>("life:goal.description"),
    level: integer().notNull().default(1),
    pillar: text(),
    deadline: text(),
    /** JSON [{id, title, done}] */
    subGoals: sealed<string>("life:goal.sub_goals"),
    completion: real().notNull().default(0),
    status: text().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [index("goal_user_idx").on(t.userId, t.level)],
);

export const projects = pgTable(
  "project",
  {
    id: id(),
    userId: ownerId(),
    name: sealed<string>("life:project.name").notNull(),
    description: sealed<string>("life:project.description"),
    pillar: text(),
    startDate: text(),
    endDate: text(),
    /** JSON [{id, title, date, done}] */
    milestones: sealed<string>("life:project.milestones"),
    /** JSON [{date, text}] */
    journal: sealed<string>("life:project.journal"),
    completion: real().notNull().default(0),
    status: text().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [index("project_user_idx").on(t.userId)],
);

export const skills = pgTable(
  "skill",
  {
    id: id(),
    userId: ownerId(),
    name: text().notNull(),
    category: text().notNull().default("mentale"),
    level: text().notNull().default("debutant"),
    hoursInvested: real().notNull().default(0),
    /** JSON string[] */
    resources: text(),
    nextStep: text(),
    createdAt: createdAt(),
  },
  (t) => [index("skill_user_idx").on(t.userId)],
);

/* Manifesto quotes ------------------------------------------------------ */

export const quotes = pgTable(
  "quote",
  {
    id: id(),
    userId: ownerId(),
    text: text().notNull(),
    author: text().notNull(),
    source: text(),
    character: text(),
    /** true = verified exact line; false = maxim inspired by the character. */
    isVerbatim: boolean().notNull().default(true),
    category: text().notNull().default("perso"),
    isFavorite: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("quote_user_idx").on(t.userId, t.category)],
);

/* Personal network (data about third parties: sealed) ------------------ */

export const people = pgTable(
  "person",
  {
    id: id(),
    userId: ownerId(),
    firstName: sealed<string>("life:person.first_name").notNull(),
    lastName: sealed<string>("life:person.last_name"),
    nickname: sealed<string>("life:person.nickname"),
    /** homme | femme | autre: only picks the kinship word (père / mère…). */
    gender: sealed<string>("life:person.gender"),
    /** The user's own record ("Moi"), root of the family tree. At most one per user. */
    isSelf: boolean().notNull().default(false),
    /** 1 contact · 2 acquaintance · 3 friend · 4 close · 5 inner circle */
    intimacy: integer().notNull().default(3),
    metAt: sealed<string>("life:person.met_at"),
    lastSeen: sealed<string>("life:person.last_seen"),
    lastContact: sealed<string>("life:person.last_contact"),
    lastContactKind: sealed<string>("life:person.last_contact_kind"),
    /** Wished contact rhythm in days. NULL = from the intimacy level. */
    contactEveryDays: sealed<number>("life:person.contact_every_days"),
    /** JSON [{kind, value}] */
    channels: sealed<string>("life:person.channels"),
    birthday: sealed<string>("life:person.birthday"),
    deceased: boolean().notNull().default(false),
    diedOn: sealed<string>("life:person.died_on"),
    coldSince: sealed<string>("life:person.cold_since"),
    coldReason: sealed<string>("life:person.cold_reason"),
    notes: sealed<string>("life:person.notes"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("person_user_id_key").on(t.userId, t.id),
    uniqueIndex("person_single_self_idx").on(t.userId).where(sql`${t.isSelf}`),
  ],
);

/**
 * One link per pair of people. For directed kinds (parent, grand-parent…)
 * `aId` holds the upper role: aId is the parent of bId.
 */
export const personLinks = pgTable(
  "person_link",
  {
    id: id(),
    userId: ownerId(),
    aId: integer().notNull(),
    bId: integer().notNull(),
    kind: sealed<string>("life:person_link.kind").notNull(),
    label: sealed<string>("life:person_link.label"),
  },
  (t) => [
    foreignKey({ columns: [t.userId, t.aId], foreignColumns: [people.userId, people.id] }).onDelete("cascade"),
    foreignKey({ columns: [t.userId, t.bId], foreignColumns: [people.userId, people.id] }).onDelete("cascade"),
    index("person_link_user_idx").on(t.userId),
  ],
);

export const personInteractions = pgTable(
  "person_interaction",
  {
    id: id(),
    userId: ownerId(),
    personId: integer().notNull(),
    date: text().notNull(),
    /** vu | appel | visio | message | autre */
    kind: sealed<string>("life:person_interaction.kind").notNull(),
    note: sealed<string>("life:person_interaction.note"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.userId, t.personId], foreignColumns: [people.userId, people.id] }).onDelete("cascade"),
    index("person_interaction_user_person_idx").on(t.userId, t.personId),
  ],
);

/** Interests (manga, climbing…): one catalogue per user, each person picks some. */
export const interests = pgTable(
  "interest",
  {
    id: id(),
    userId: ownerId(),
    name: text().notNull(),
    /** Normalised name (lowercase, no accents): "Mangas" and "mangas" are the same. */
    key: text().notNull(),
    /** #rrggbb, NULL = derived from the name */
    color: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("interest_user_key_idx").on(t.userId, t.key),
    unique("interest_user_id_key").on(t.userId, t.id),
  ],
);

export const personInterests = pgTable(
  "person_interest",
  {
    id: id(),
    userId: ownerId(),
    personId: integer().notNull(),
    interestId: integer().notNull(),
  },
  (t) => [
    foreignKey({ columns: [t.userId, t.personId], foreignColumns: [people.userId, people.id] }).onDelete("cascade"),
    foreignKey({ columns: [t.userId, t.interestId], foreignColumns: [interests.userId, interests.id] }).onDelete(
      "cascade",
    ),
    uniqueIndex("person_interest_pair_idx").on(t.userId, t.personId, t.interestId),
    index("person_interest_interest_idx").on(t.userId, t.interestId),
  ],
);

/* Optional gamification (off by default, ADR 0010) --------------------- */

export const achievements = pgTable(
  "achievement",
  {
    id: id(),
    userId: ownerId(),
    code: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    icon: text().notNull().default("award"),
    isUnlocked: boolean().notNull().default(false),
    unlockedAt: text(),
  },
  (t) => [uniqueIndex("achievement_user_code_idx").on(t.userId, t.code)],
);

export const dailyScores = pgTable(
  "daily_score",
  {
    id: id(),
    userId: ownerId(),
    date: text().notNull(),
    score: real().notNull().default(0),
    habitsCompleted: integer().notNull().default(0),
    habitsTotal: integer().notNull().default(0),
    phasesCompleted: integer().notNull().default(0),
    phasesTotal: integer().notNull().default(0),
    xpEarned: integer().notNull().default(0),
  },
  (t) => [uniqueIndex("daily_score_user_date_idx").on(t.userId, t.date)],
);
