import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { db } from "./db/client";
import * as schema from "./db/schema";
import { env } from "./env";

/**
 * Authentication: email + password (scrypt, Better Auth default) and a
 * mandatory TOTP second factor, enforced by the data access layer.
 * See docs/adr/0003-authentication.md.
 */
export const auth = betterAuth({
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
  },
  user: {
    deleteUser: { enabled: true },
  },
  plugins: [twoFactor({ issuer: "K" }), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
