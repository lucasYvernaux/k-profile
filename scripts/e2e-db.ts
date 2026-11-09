/**
 * Resets and migrates the e2e database. Refuses to run on a database whose
 * name does not end with "_test", to protect real data.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

async function main() {
  const url = process.env.E2E_DATABASE_URL ?? "postgres://k:k_dev_password@localhost:5432/k_test";
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to reset database "${name}": its name must end with _test`);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await client.query("CREATE SCHEMA public");
    await migrate(drizzle({ client }), { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
  console.log(`E2E database ${name} reset and migrated.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
