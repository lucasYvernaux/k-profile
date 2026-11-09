import "server-only";
import { z } from "zod";

const base64Key = z
  .string()
  .refine((value) => Buffer.from(value, "base64").length === 32, {
    message: "must be 32 random bytes encoded in base64",
  });

const envSchema = z.object({
  // Required on Node.js; on Cloudflare Workers the HYPERDRIVE binding is used instead.
  DATABASE_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  DATA_ENCRYPTION_KEY: base64Key,
  ALLOW_SIGNUP: z.enum(["true", "false"]).default("false"),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  CRON_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validated server environment. Fails fast with the names of bad variables only. */
export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Invalid server environment variables: ${names}`);
    }
    cached = parsed.data;
  }
  return cached;
}
