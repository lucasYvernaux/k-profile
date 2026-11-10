/*
 * Typed HTTP errors. Route handlers throw them; the route wrapper turns them into
 * JSON responses. Messages are written for the end user and never contain internals.
 */

export type ValidationIssue = { path: string; message: string };

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: ValidationIssue[],
    readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message = "Requête invalide", issues?: ValidationIssue[]) =>
  new HttpError(400, "bad_request", message, issues);

export const unauthorized = () => new HttpError(401, "unauthorized", "Authentification requise");

export const forbidden = (code = "forbidden") => new HttpError(403, code, "Accès refusé");

export const notFound = (message = "Ressource introuvable") => new HttpError(404, "not_found", message);

export const conflict = (message = "Conflit avec les données existantes") => new HttpError(409, "conflict", message);

export const payloadTooLarge =() => new HttpError(413, "payload_too_large", "Contenu trop volumineux");

export const unsupportedMediaType = () =>
  new HttpError(415, "unsupported_media_type", "Le contenu doit être au format JSON");

export const tooManyRequests = (retryAfterSeconds: number) =>
  new HttpError(429, "too_many_requests", "Trop de tentatives, réessaie plus tard", undefined, {
    "Retry-After": String(retryAfterSeconds),
  });
