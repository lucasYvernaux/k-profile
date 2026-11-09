import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

/*
 * Migrations must use Neon's direct (unpooled) connection: the pooled
 * endpoint runs PgBouncer in transaction mode, which does not keep session
 * state (Neon agent skill, "Pooled vs direct connections").
 * `neon env pull` writes both DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED.
 */
const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: migrationUrl },
  strict: true,
});
