import { forbidden } from "./errors";

/*
 * CSRF defence for state-changing requests (OWASP CSRF Cheat Sheet:
 * "Verifying Origin With Standard Headers" + Fetch Metadata), on top of the
 * SameSite=Lax session cookie. See docs/security/owasp-top10.md (A01).
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

/** Throws 403 unless a mutating request provably comes from this origin. */
export function assertSameOrigin(request: Request): void {
  if (isSafeMethod(request.method)) return;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw forbidden("cross_site_request");

  const origin = request.headers.get("origin");
  if (!origin) {
    // Modern browsers always send Fetch Metadata; accept only an explicit same-origin.
    if (fetchSite === "same-origin") return;
    throw forbidden("missing_origin");
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("invalid_origin");
  }
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (originHost !== host) throw forbidden("origin_mismatch");
}
