export type HabitField = { key: string; label: string; type?: "text" | "select"; options?: string[] };

export type HabitDef = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  pillar: string;
  period: string;
  frequency: string;
  timesPerWeek: number | null;
  daysOfWeek: string | null;
  targetTime: string | null;
  targetDuration: number | null;
  trackingType: string;
  quantityUnit: string | null;
  quantityGoal: number | null;
  fields: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type HabitEntry = {
  id: number;
  habitId: number;
  date: string;
  completed: boolean;
  skipped: boolean;
  quantity: number | null;
  notes: string | null;
};

export type PhaseEntry = {
  id: number;
  date: string;
  phaseKey: string;
  status: "completed" | "skipped" | "missed";
};

export type TimerRow = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  frequencyDays: number;
  lastDone: string | null;
  nextDue: string | null;
  isActive: boolean;
  remaining: number;
  status: "ok" | "soon" | "late";
};

export type Achievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
};

export type PlayerData = {
  /** Optional gamification switch (ADR 0010): false hides level, streaks and badges. */
  gamification: boolean;
  xp: number;
  level: number;
  levelName: string;
  levelSubtitle: string;
  xpInto: number;
  xpNext: number;
  pctToNext: number;
  todayScore: number;
  streak: number;
  bestStreak: number;
  pillars: Record<string, number>;
  pillarsPrev: Record<string, number>;
  achievements: Achievement[];
  range: {
    from: string;
    to: string;
    days: { date: string; score: number; habitsCompleted: number; habitsTotal: number; phasesCompleted: number }[];
    avgScore: number;
    avgPrev: number | null;
    deepWorkMin: number;
    trainingMin: number;
    practiceMin: number;
    readingMin: number;
    pagesRead: number;
    medSessions: number;
    journalDays: number;
    habitDoneCount: number;
  };
};

export type GoalRow = {
  id: number;
  title: string;
  description: string | null;
  level: number;
  pillar: string | null;
  deadline: string | null;
  subGoals: string | null;
  completion: number;
  status: string;
};

export type ProjectRow = {
  id: number;
  name: string;
  description: string | null;
  pillar: string | null;
  startDate: string | null;
  endDate: string | null;
  milestones: string | null;
  journal: string | null;
  completion: number;
  status: string;
};

export type SkillRow = {
  id: number;
  name: string;
  category: string;
  level: string;
  hoursInvested: number;
  resources: string | null;
  nextStep: string | null;
};

export type JournalRow = {
  id: number;
  date: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  wins: string | null;
  losses: string | null;
  distractions: string | null;
  emotionsNote: string | null;
  improvements: string | null;
  violatedRules: string | null;
  trapsHit: string | null;
  notes: string | null;
};

export type EmotionLogRow = {
  id: number;
  emotion: string;
  intensity: number;
  triggerText: string | null;
  reaction: string | null;
  idealReaction: string | null;
  date: string;
  hour: number;
};

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
