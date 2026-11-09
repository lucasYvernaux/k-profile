import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://k:k_dev_password@localhost:5432/k_test";

/** Variables shared by both targets (test-only values, never real secrets). */
const APP_ENV = {
  BETTER_AUTH_URL: BASE_URL,
  BETTER_AUTH_SECRET: process.env.E2E_AUTH_SECRET ?? "e2e-only-secret-not-for-production-0123456789",
  DATA_ENCRYPTION_KEY: process.env.E2E_DATA_KEY ?? "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  ALLOW_SIGNUP: "true",
  CRON_SECRET: "e2e-cron-secret-not-for-production-0123456789",
};

/*
 * E2E_TARGET=workers runs the suite against the Cloudflare Workers build
 * (`pnpm cf:build` first) inside workerd via `wrangler dev`, with Hyperdrive
 * pointed at the local test database. Default: Node.js (`next start`).
 */
const workersTarget = process.env.E2E_TARGET === "workers";
const webServerCommand = workersTarget
  ? [
      `pnpm exec wrangler dev --port ${PORT} --ip 127.0.0.1`,
      ...Object.entries(APP_ENV).map(([key, value]) => `--var ${key}:${value}`),
    ].join(" ")
  : `pnpm exec next start -p ${PORT}`;
const webServerEnv: Record<string, string> = workersTarget
  ? { CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: DATABASE_URL }
  : { DATABASE_URL, ...APP_ENV };

/*
 * E2E tests run against a production build and a dedicated database
 * (E2E_DATABASE_URL). Run `pnpm build` first; `pnpm test:e2e` migrates the
 * test database and starts the server.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "off",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Optional: reuse a preinstalled Chromium (e.g. in CI images).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: `${BASE_URL}/connexion`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 120_000,
    env: webServerEnv,
  },
});
