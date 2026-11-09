import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { MicroThresholds } from "@/domain/business";
import type { ScheduleBlock } from "@/domain/schedule";
import { user } from "./auth-schema";

export * from "./auth-schema";

/*
 * Every column suffixed "Enc" holds AES-256-GCM ciphertext produced by
 * src/server/crypto.ts with a per-user data key (see ADR 0002).
 * Plain columns only hold what the app must query or sort on.
 */

const ownerId = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const createdAt = () => timestamp({ withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/** Per-user data encryption key, wrapped with the master key. */
export const userKey = pgTable("user_key", {
  userId: ownerId().primaryKey(),
  wrappedKey: text().notNull(),
  masterKeyVersion: integer().notNull().default(1),
  createdAt: createdAt(),
});

export const userProfile = pgTable("user_profile", {
  userId: ownerId().primaryKey(),
  timeZone: text().notNull().default("Europe/Paris"),
  programStart: date({ mode: "string" }),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  schedule: jsonb().$type<ScheduleBlock[]>().notNull(),
  microThresholds: jsonb().$type<MicroThresholds>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditKind = pgEnum("audit_kind", ["baseline", "follow_up"]);

/** Phase 0 audit and later re-assessments. */
export const audit = pgTable(
  "audit",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    kind: auditKind().notNull(),
    takenOn: date({ mode: "string" }).notNull(),
    payloadEnc: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("audit_user_idx").on(table.userId, table.takenOn)],
);

export const habitStatus = pgEnum("habit_status", ["locked", "forming", "stable", "paused"]);
export const habitCadence = pgEnum("habit_cadence", ["daily", "weekly"]);
export const pillar = pgEnum("pillar", [
  "mental",
  "body",
  "maker",
  "strategy",
  "family",
  "presence",
]);

export const habit = pgTable(
  "habit",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    title: text().notNull(),
    pillar: pillar().notNull(),
    cadence: habitCadence().notNull(),
    timesPerWeek: integer(),
    status: habitStatus().notNull().default("locked"),
    queueOrder: integer().notNull(),
    activatedOn: date({ mode: "string" }),
    stabilizedOn: date({ mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("habit_user_idx").on(table.userId, table.queueOrder)],
);

export const habitCheckIn = pgTable(
  "habit_check_in",
  {
    habitId: uuid()
      .notNull()
      .references(() => habit.id, { onDelete: "cascade" }),
    userId: ownerId(),
    day: date({ mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.habitId, table.day] }),
    index("check_in_user_day_idx").on(table.userId, table.day),
  ],
);

/** Daily priorities and health log (sleep, drinks), encrypted. */
export const dailyEntry = pgTable(
  "daily_entry",
  {
    userId: ownerId(),
    day: date({ mode: "string" }).notNull(),
    prioritiesEnc: text(),
    healthEnc: text(),
    updatedAt: updatedAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    day: date({ mode: "string" }).notNull(),
    payloadEnc: text().notNull(),
    /** Client-generated id, makes offline replays idempotent. */
    clientId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("journal_user_day_idx").on(table.userId, table.day),
    uniqueIndex("journal_client_id_idx").on(table.userId, table.clientId),
  ],
);

export const milestone = pgTable(
  "milestone",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    phaseId: text().notNull(),
    title: text().notNull(),
    position: integer().notNull(),
    doneOn: date({ mode: "string" }),
    createdAt: createdAt(),
  },
  (table) => [index("milestone_user_phase_idx").on(table.userId, table.phaseId, table.position)],
);

export const quarterlyReview = pgTable(
  "quarterly_review",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    quarter: text().notNull(),
    payloadEnc: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("review_user_quarter_idx").on(table.userId, table.quarter)],
);

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    endpoint: text().notNull(),
    keysEnc: text().notNull(),
    reminderTime: text().notNull().default("21:30"),
    enabled: boolean().notNull().default(true),
    lastSentOn: date({ mode: "string" }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("push_endpoint_idx").on(table.endpoint)],
);

export const habitRelations = relations(habit, ({ many }) => ({
  checkIns: many(habitCheckIn),
}));

export const habitCheckInRelations = relations(habitCheckIn, ({ one }) => ({
  habit: one(habit, { fields: [habitCheckIn.habitId], references: [habit.id] }),
}));
