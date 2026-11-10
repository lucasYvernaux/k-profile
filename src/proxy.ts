import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware). It always runs on the Node.js
 * runtime; on Cloudflare Workers, OpenNext 1.20 bundles it as an
 * experimental, unofficially maintained feature (ADR 0012).
 *
 * 1. Strict, nonce-based Content Security Policy on every page
 *    (Next.js CSP guide; OWASP A05 Injection / XSS defence in depth).
 * 2. Optimistic redirect to sign-in when no session cookie is present.
 *    This is only a UX shortcut: real authorization happens in the data
 *    access layer (src/server/session.ts) on every request.
 */
const PROTECTED_PREFIXES = [
  "/aujourdhui",
  "/habitudes",
  "/journal",
  "/tableau-de-bord",
  "/revue",
  "/feuille-de-route",
  "/reglages",
  "/onboarding",
  "/securite",
  // Life modules merged from NYX-KAIROS (ADR 0010)
  "/routine",
  "/bilan",
  "/consommations",
  "/sante",
  "/reseau",
  "/entretien",
  "/objectifs",
  "/revue-hebdo",
  "/audit-mensuel",
  "/manifeste",
  "/atelier",
];

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.BETTER_AUTH_URL?.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isProtected && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|sw.js|manifest.webmanifest|icon-).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
