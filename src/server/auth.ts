import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { cache } from "react";
import { getDb, isCloudflareWorkers, type Database } from "./db/client";
import * as schema from "./db/schema";
import { env } from "./env";

/**
 * Authentication: email + password (scrypt, Better Auth default) and a
 * mandatory TOTP second factor, enforced by the data access layer.
 * See docs/adr/0003-authentification-forte.md.
 *
 * The instance is built per request because it holds the database client,
 * which cannot be shared between requests on Cloudflare Workers (ADR 0008).
 */
export function createAuth(db: Database) {
  return betterAuth({
    appName: "K",
    baseURL: env().BETTER_AUTH_URL,
    secret: env().BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      // Single-user app: sign-up is closed unless explicitly opened.
      disableSignUp: env().ALLOW_SIGNUP !== "true",
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/two-factor/*": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      // Behind Cloudflare, the client IP comes from a header set by Cloudflare
      // itself, so rate limits count per real client.
      ...(isCloudflareWorkers() ? { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } } : {}),
    },
    user: {
      deleteUser: { enabled: true },
    },
    plugins: [twoFactor({ issuer: "K" }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Auth instance for the current request. */
export const getAuth = cache((): Auth => createAuth(getDb()));
