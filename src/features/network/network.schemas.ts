import { z } from "zod";
import { LIMITS, dateKey, id, optionalDate, optionalInt, optionalText, requiredText } from "@/shared/lib/validation";
import { CHANNELS, INTERACTION_KINDS } from "./domain/network";
import { GENDERS, LINK_KINDS } from "./domain/kinship";

const keysOf = (record: Record<string, unknown>) => Object.keys(record) as [string, ...string[]];
const nullableEnum = (record: Record<string, unknown>) =>
  z.preprocess((v) => (v === "" ? null : v), z.enum(keysOf(record)).nullable()).optional();

const channel = z.object({
  kind: z.enum(keysOf(CHANNELS)),
  value: z.string().trim().min(1).max(300),
});

export const INTEREST_NAME_MAX = 40;
const interestName = z.string().trim().min(1).max(INTEREST_NAME_MAX);
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Couleur attendue au format #rrggbb");

export const personSchema = z.object({
  firstName: requiredText(80),
  lastName: optionalText(80),
  nickname: optionalText(80),
  gender: nullableEnum(GENDERS),
  intimacy: z.coerce.number().int().min(1).max(5).optional(),
  metAt: optionalDate,
  lastSeen: optionalDate,
  lastContact: optionalDate,
  lastContactKind: nullableEnum(INTERACTION_KINDS),
  contactEveryDays: optionalInt(1, 3_650),
  channels: z.array(channel).max(30).optional(),
  birthday: optionalDate,
  deceased: z.boolean().optional(),
  diedOn: optionalDate,
  coldSince: optionalDate,
  coldReason: optionalText(500),
  notes: optionalText(LIMITS.text),
  /** Replaces the person's domains when present. */
  interests: z.array(interestName).max(30).optional(),
});

/** Creation only: `isSelf` marks the user's own record (at most one). */
export const createPersonSchema = personSchema.extend({ isSelf: z.boolean().optional() });

export const updatePersonSchema = personSchema.extend({ id });

export const linkSchema = z
  .object({
    /** For directed kinds, aId holds the upper role (aId is the parent of bId). */
    aId: id,
    bId: id,
    kind: z.enum(keysOf(LINK_KINDS)).optional(),
    label: optionalText(80),
  })
  .refine((v) => v.aId !== v.bId, { message: "Deux personnes distinctes requises", path: ["bId"] });

export const interactionSchema = z.object({
  personId: id,
  kind: z.enum(keysOf(INTERACTION_KINDS)).optional(),
  date: dateKey.optional(),
  note: optionalText(1_000),
});

export const coldSchema = z.object({
  personId: id,
  cold: z.boolean(),
  since: dateKey.optional(),
  reason: optionalText(500),
});

export const updateInterestSchema = z.object({
  id,
  name: interestName.optional(),
  color: z.preprocess((v) => (v === "" ? null : v), hexColor.nullable()).optional(),
});

export const circleSchema = z.object({ completed: z.boolean(), date: dateKey.optional() });

export type PersonInput = z.infer<typeof personSchema>;
export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type LinkInput = z.infer<typeof linkSchema>;
export type InteractionInput = z.infer<typeof interactionSchema>;
export type ColdInput = z.infer<typeof coldSchema>;
export type UpdateInterestInput = z.infer<typeof updateInterestSchema>;
