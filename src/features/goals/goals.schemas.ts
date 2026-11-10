import { z } from "zod";
import { LIMITS, id, jsonArrayText, optionalDate, optionalText, requiredText } from "@/shared/lib/validation";

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);
const optionalSlug = z.preprocess((v) => (v === "" ? null : v), slug.nullable()).optional();
const status = z.enum(["active", "completed", "paused", "abandoned"]);
const percent = z.coerce.number().min(0).max(100);

const subGoal = z.object({ id: z.string().max(64), title: z.string().max(LIMITS.name), done: z.boolean() });
const milestone = z.object({
  id: z.string().max(64),
  title: z.string().max(LIMITS.name),
  date: z.string().max(10),
  done: z.boolean(),
});
const projectNote = z.object({ date: z.string().max(10), text: z.string().max(LIMITS.text) });

/* Goals */
const goalFields = {
  title: requiredText(),
  description: optionalText(LIMITS.text),
  level: z.coerce.number().int().min(1).max(5),
  pillar: optionalSlug,
  deadline: optionalDate,
  subGoals: jsonArrayText(subGoal, 100),
  completion: percent,
  status,
};
export const createGoalSchema = z.object(goalFields).partial().required({ title: true });
export const updateGoalSchema = z.object(goalFields).partial();

/* Projects */
const projectFields = {
  name: requiredText(),
  description: optionalText(LIMITS.text),
  pillar: optionalSlug,
  startDate: optionalDate,
  endDate: optionalDate,
  milestones: jsonArrayText(milestone, 200),
  journal: jsonArrayText(projectNote, 500),
  completion: percent,
  status,
};
export const createProjectSchema = z.object(projectFields).partial().required({ name: true });
export const updateProjectSchema = z.object(projectFields).partial();

/* Skills */
const skillFields = {
  name: requiredText(),
  category: slug,
  level: slug,
  hoursInvested: z.coerce.number().min(0).max(100_000),
  resources: jsonArrayText(z.string().max(LIMITS.name), 100),
  nextStep: optionalText(LIMITS.text),
};
export const createSkillSchema = z.object(skillFields).partial().required({ name: true });
export const updateSkillSchema = z.object(skillFields).partial().extend({ id });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
