import "server-only";
import { auth } from "../auth";
import { env } from "../env";

/**
 * CSRF defence for JSON route handlers: the request must come from our own
 * origin (OWASP CSRF cheat sheet, "Verifying origin with standard headers").
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(env().BETTER_AUTH_URL).origin;
}

/** Signed-in user with 2FA enabled, or null. */
export async function apiUser(request: Request): Promise<{ id: string } | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !session.user.twoFactorEnabled) {
    return null;
  }
  return { id: session.user.id };
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
