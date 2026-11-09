import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

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
    command: `pnpm exec next start -p ${PORT}`,
    url: `${BASE_URL}/connexion`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://k:k_dev_password@localhost:5432/k_test",
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: process.env.E2E_AUTH_SECRET ?? "e2e-only-secret-not-for-production-0123456789",
      DATA_ENCRYPTION_KEY: process.env.E2E_DATA_KEY ?? "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
      ALLOW_SIGNUP: "true",
      CRON_SECRET: "e2e-cron-secret-not-for-production-0123456789",
    },
  },
});
