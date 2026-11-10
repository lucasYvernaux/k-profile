import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { goals, projects, skills } from "@/server/db/schema";
import { currentUserId } from "@/server/crypto/user-scope";
import { evaluateAchievements } from "@/features/progress/server/progress.service";
import { serverTodayKey } from "@/server/time";
import { definedOnly } from "@/shared/lib/validation";
import type {
  CreateGoalInput,
  CreateProjectInput,
  CreateSkillInput,
  UpdateGoalInput,
  UpdateProjectInput,
  UpdateSkillInput,
} from "../goals.schemas";

const EMPTY_LIST = "[]";

/* Goals */
const ownGoal = (goalId: number) => and(eq(goals.userId, currentUserId()), eq(goals.id, goalId));

export function listGoals() {
  return getDb()
    .select()
    .from(goals)
    .where(eq(goals.userId, currentUserId()))
    .orderBy(asc(goals.level), asc(goals.id));
}

export async function createGoal(input: CreateGoalInput) {
  const [row] = await getDb()
    .insert(goals)
    .values({
      ...definedOnly(input),
      userId: currentUserId(),
      title: input.title,
      subGoals: input.subGoals ?? EMPTY_LIST,
    })
    .returning();
  return row;
}

export async function updateGoal(goalId: number, patch: UpdateGoalInput) {
  const values = definedOnly(patch);
  if (Object.keys(values).length) await getDb().update(goals).set(values).where(ownGoal(goalId));
}

export async function deleteGoal(goalId: number) {
  await getDb().delete(goals).where(ownGoal(goalId));
}

/* Projects */
const ownProject = (projectId: number) => and(eq(projects.userId, currentUserId()), eq(projects.id, projectId));

export function listProjects() {
  return getDb().select().from(projects).where(eq(projects.userId, currentUserId())).orderBy(desc(projects.id));
}

export async function createProject(input: CreateProjectInput) {
  const [row] = await getDb()
    .insert(projects)
    .values({
      ...definedOnly(input),
      userId: currentUserId(),
      name: input.name,
      startDate: input.startDate ?? serverTodayKey(),
      milestones: input.milestones ?? EMPTY_LIST,
      journal: EMPTY_LIST,
    })
    .returning();
  return row;
}

/** Completing a project can unlock a badge. */
export async function updateProject(projectId: number, patch: UpdateProjectInput) {
  const values = definedOnly(patch);
  if (Object.keys(values).length) await getDb().update(projects).set(values).where(ownProject(projectId));
  await evaluateAchievements();
}

export async function deleteProject(projectId: number) {
  await getDb().delete(projects).where(ownProject(projectId));
}

/* Skills */
const ownSkill = (skillId: number) => and(eq(skills.userId, currentUserId()), eq(skills.id, skillId));

export function listSkills() {
  return getDb().select().from(skills).where(eq(skills.userId, currentUserId())).orderBy(asc(skills.id));
}

export async function createSkill(input: CreateSkillInput) {
  const [row] = await getDb()
    .insert(skills)
    .values({
      ...definedOnly(input),
      userId: currentUserId(),
      name: input.name,
      resources: input.resources ?? EMPTY_LIST,
    })
    .returning();
  return row;
}

export async function updateSkill({ id, ...patch }: UpdateSkillInput) {
  const values = definedOnly(patch);
  if (Object.keys(values).length) await getDb().update(skills).set(values).where(ownSkill(id));
}

export async function deleteSkill(skillId: number) {
  await getDb().delete(skills).where(ownSkill(skillId));
}
