import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
}

/** Reads and validates the session once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  const { id, name, email, twoFactorEnabled } = session.user;
  return { id, name, email, twoFactorEnabled: Boolean(twoFactorEnabled) };
});

/** Signed-in user, second factor not required yet (2FA enrolment pages). */
export async function requireSignedIn(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/connexion");
  }
  return user;
}

/**
 * Signed-in user with TOTP enabled. Every page and action that touches
 * personal data must go through this function (authorization close to data).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await requireSignedIn();
  if (!user.twoFactorEnabled) {
    redirect("/securite/2fa");
  }
  return user;
}
