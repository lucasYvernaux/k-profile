"use client";

/*
 * Browser-side fetch for the app's own API. Same signature as fetch(), plus:
 *  - same-origin credentials only, no caching
 *  - an expired session (401) sends the user back to the login page
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, { cache: "no-store", credentials: "same-origin", ...init });
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.assign("/connexion");
  }
  return response;
}

/** POST/PUT/PATCH helper sending a JSON body. */
export function apiSend(input: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<Response> {
  return apiFetch(input, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
