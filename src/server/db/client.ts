import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { cache } from "react";
import * as schema from "./schema";

/*
 * Database access works in two runtimes (ADR 0008):
 *
 * - Node.js (`next dev`, `next start`, tests): one shared pool built from
 *   DATABASE_URL, reused across requests. With Neon, DATABASE_URL is the
 *   pooled (-pooler, PgBouncer) endpoint, recommended for app traffic.
 * - Cloudflare Workers: I/O objects cannot be shared between requests, so a
 *   new client is created per request from the Hyperdrive binding, which
 *   keeps the real connection pool next to the database. Neon's guidance for
 *   Cloudflare is node-postgres + Hyperdrive. The client is
 *   memoised per request (keyed on the request's ExecutionContext) so a
 *   single request never opens more than one connection pool.
 */
function createPoolDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createPoolDb>;

/**
 * One connection per request, as in Cloudflare's Hyperdrive examples. Queries
 * issued before the connection is ready are queued by node-postgres, and
 * concurrent queries run one after another on this single connection.
 */
function createRequestDb(connectionString: string): Database {
  const client = new Client({ connectionString });
  client.connect().catch((error: unknown) => {
    console.error(JSON.stringify({ message: "database connection failed", error: String(error) }));
  });
  // Socket closed by the runtime at the end of the request: not an app error.
  client.on("error", () => undefined);
  return drizzle({ client, schema, casing: "snake_case" }) as unknown as Database;
}

const globalForDb = globalThis as unknown as { nodeDb?: Database };

function nodeDb(connectionString: string): Database {
  globalForDb.nodeDb ??= createPoolDb(connectionString);
  return globalForDb.nodeDb;
}

const workerDbs = new WeakMap<object, Database>();

function workerDb(): Database {
  const { env, ctx } = getCloudflareContext();
  const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
  if (!hyperdrive) {
    throw new Error("Missing HYPERDRIVE binding");
  }
  const key = ctx as object;
  let db = workerDbs.get(key);
  if (!db) {
    db = createRequestDb(hyperdrive.connectionString);
    workerDbs.set(key, db);
  }
  return db;
}

/** Documented way to detect the Workers runtime. */
export function isCloudflareWorkers(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

/** Database client for the current request. */
export const getDb = cache((): Database => {
  if (isCloudflareWorkers()) {
    return workerDb();
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }
  return nodeDb(url);
});
