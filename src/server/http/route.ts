import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { withUserData } from "@/server/crypto/user-scope";
import { describeError, logger } from "@/server/log";
import { HttpError, badRequest, payloadTooLarge, unauthorized, unsupportedMediaType, type ValidationIssue } from "./errors";
import { apiUser } from "./guards";
import { assertSameOrigin } from "./origin";

/*
 * Single entry point for the JSON API of the "life" modules (ADR 0010). In order:
 *  1. rejects cross-origin state-changing requests (CSRF)
 *  2. requires a signed-in user with TOTP enabled (same rule as every page)
 *  3. validates path params, query string and JSON body with zod (allow-list)
 *  4. runs the handler with the user's data key, so sealed columns work and
 *     every service reads the owner from `currentUserId()`
 *  5. maps thrown errors to JSON responses without leaking internals
 *  6. marks every response as non-cacheable
 */

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

type Schema<T> = z.ZodType<T>;

export type RouteOptions<B, Q, P> = {
  body?: Schema<B>;
  query?: Schema<Q>;
  params?: Schema<P>;
  maxBodyBytes?: number;
};

export type RouteInput<B, Q, P> = {
  request: NextRequest;
  body: B;
  query: Q;
  params: P;
  userId: string;
};

function toIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

function validate<T>(schema: Schema<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw badRequest("Données invalides", toIssues(parsed.error));
  return parsed.data;
}

async function readJsonBody(request: NextRequest, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) throw unsupportedMediaType();
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw payloadTooLarge();
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw payloadTooLarge();
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest("JSON invalide");
  }
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function errorResponse(error: unknown, request: NextRequest): Response {
  if (error instanceof HttpError) {
    if (error.status >= 500) {
      logger.error("http.error", { status: error.status, code: error.code, path: request.nextUrl.pathname });
    }
    return noStore(
      Response.json(
        { error: error.message, code: error.code, ...(error.issues ? { issues: error.issues } : {}) },
        { status: error.status, headers: error.headers },
      ),
    );
  }
  // Unexpected failure: details go to the logs only (OWASP A10:2025).
  logger.error("http.unhandled_error", {
    method: request.method,
    path: request.nextUrl.pathname,
    ...describeError(error),
  });
  return noStore(Response.json({ error: "Erreur interne", code: "internal_error" }, { status: 500 }));
}

export function route<B = undefined, Q = undefined, P = undefined>(
  options: RouteOptions<B, Q, P>,
  handler: (input: RouteInput<B, Q, P>) => Promise<unknown> | unknown,
) {
  return async (request: NextRequest, context: RouteContext): Promise<Response> => {
    try {
      assertSameOrigin(request);
      const user = await apiUser(request);
      if (!user) throw unauthorized();
      const params = (options.params ? validate(options.params, await context?.params) : undefined) as P;
      const query = (
        options.query ? validate(options.query, Object.fromEntries(request.nextUrl.searchParams)) : undefined
      ) as Q;
      const body = (
        options.body
          ? validate(options.body, await readJsonBody(request, options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES))
          : undefined
      ) as B;

      const result = await withUserData(user.id, async () =>
        handler({ request, body, query, params, userId: user.id }),
      );
      if (result instanceof Response) return noStore(result);
      return noStore(Response.json(result ?? { ok: true }));
    } catch (error) {
      return errorResponse(error, request);
    }
  };
}
