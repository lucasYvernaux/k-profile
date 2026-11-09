import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

/** One connection pool per process (reused across hot reloads in dev). */
const sql = globalForDb.sql ?? postgres(env().DATABASE_URL, { max: 10 });
if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Database = typeof db;
