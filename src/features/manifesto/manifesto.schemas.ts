import { z } from "zod";
import { LIMITS, id, optionalText, requiredText } from "@/shared/lib/validation";

const category = z.string().regex(/^[a-z0-9-]{1,40}$/);

const quoteFields = {
  text: requiredText(LIMITS.text),
  author: z.string().trim().max(LIMITS.name).optional(),
  source: optionalText(LIMITS.name),
  character: optionalText(LIMITS.name),
  isVerbatim: z.boolean().optional(),
  category: category.optional(),
  isFavorite: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createQuoteSchema = z.object(quoteFields);
export const updateQuoteSchema = z.object(quoteFields).partial().extend({ id });

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
