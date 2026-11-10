import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";
import { expectAccessible, totp } from "./helpers";

/*
 * Life modules merged from NYX-KAIROS (ADR 0010): every page passes axe in
 * light and dark mode, sensitive data is stored encrypted, and one account can
 * neither read nor change another account's data.
 */
const PASSWORD = "une phrase de passe assez longue";
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://k:k_dev_password@localhost:5432/k_test";

const LIFE_PAGES = [
  ["/routine", "Routine"],
  ["/bilan", null],
  ["/consommations", null],
  ["/sante", null],
  ["/reseau", null],
  ["/entretien", null],
  ["/objectifs", null],
  ["/revue-hebdo", null],
  ["/audit-mensuel", null],
  ["/manifeste", null],
  ["/atelier", null],
] as const;

test.describe.configure({ mode: "serial" });

async function signUpWithTotp(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await context.newPage();
  await page.goto("/inscription");
  await page.getByLabel("Prénom ou pseudo").fill("Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page).toHaveURL(/\/securite\/2fa$/);
  await page.getByLabel("Confirme ton mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Commencer l'activation" }).click();
  const secret = (await page.locator("code").first().textContent()) ?? "";
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Activer la double authentification" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  return page;
}

/** Same-origin JSON call from the page (the API rejects requests without Origin). */
function api(page: Page, method: string, url: string, body?: unknown) {
  return page.evaluate(
    async ({ method, url, body }) => {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, json: await response.json().catch(() => null) };
    },
    { method, url, body },
  );
}

let owner: Page;
let other: Page;
let personId = 0;

test.beforeAll(async ({ browser }) => {
  owner = await signUpWithTotp(browser, "life-owner@example.com");
  other = await signUpWithTotp(browser, "life-other@example.com");
});

test.afterAll(async () => {
  await owner.context().close();
  await other.context().close();
});

test("life pages are protected without a session", async ({ page }) => {
  await page.goto("/sante");
  await expect(page).toHaveURL(/\/connexion$/);
  const response = await page.request.get("/api/people");
  expect(response.status()).toBe(401);
});

for (const [path, heading] of LIFE_PAGES) {
  test(`${path} renders and is accessible`, async () => {
    await owner.goto(path);
    const h1 = owner.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    if (heading) await expect(h1).toHaveText(heading);
    // Entrance animations (framer-motion, < 1 s) fade elements in: axe must
    // measure contrast on the final colours, not on a half-transparent frame.
    await owner.waitForTimeout(1_500);
    await expectAccessible(owner);
  });
}

test("the main navigation lists the merged modules and marks the current page", async () => {
  await owner.goto("/reseau");
  const nav = owner.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.getByRole("link", { name: "Réseau" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Consommations" })).toBeVisible();
});

test("network data is stored encrypted", async () => {
  const created = await api(owner, "POST", "/api/people", { firstName: "Camille", notes: "secret de famille", intimacy: 5 });
  expect(created.status).toBe(200);
  personId = created.json.id;

  const read = await api(owner, "GET", "/api/people");
  expect(read.json.people.map((p: { firstName: string }) => p.firstName)).toContain("Camille");

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query("select first_name, notes from person where id = $1", [personId]);
    expect(rows[0].first_name).toMatch(/^v1\./);
    expect(rows[0].first_name).not.toContain("Camille");
    expect(rows[0].notes).not.toContain("secret");
  } finally {
    await db.end();
  }
});

test("another account can neither read nor change that data", async () => {
  const read = await api(other, "GET", "/api/people");
  expect(read.status).toBe(200);
  expect(read.json.people).toEqual([]);

  const update = await api(other, "PUT", "/api/people", { id: personId, firstName: "Pirate" });
  expect(update.status).toBe(404);
  await api(other, "DELETE", `/api/people?id=${personId}`);
  const link = await api(other, "POST", "/api/people/interactions", { personId, kind: "appel" });
  expect(link.status).toBe(404);

  const still = await api(owner, "GET", "/api/people");
  expect(still.json.people.map((p: { firstName: string }) => p.firstName)).toContain("Camille");
});

test("cross-site requests are refused", async () => {
  const response = await owner.request.post("/api/people", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { firstName: "X" },
  });
  expect(response.status()).toBe(403);
});

test("gamification is off by default and can be turned on", async () => {
  const before = await api(owner, "GET", "/api/player");
  expect(before.json.gamification).toBe(false);
  // The switch itself lives on /reglages, checked by axe in journey.spec.ts
  // (Réglages needs the onboarding, which this account skips).
  expect((await api(owner, "PUT", "/api/settings/gamification", { enabled: true })).status).toBe(200);
  const after = await api(owner, "GET", "/api/player");
  expect(after.json.gamification).toBe(true);
  await owner.goto("/routine");
  await expect(owner.getByText("Score du jour")).toBeVisible();
});

test("the full export includes the life modules, decrypted", async () => {
  const exported = await api(owner, "GET", "/api/export?format=json");
  expect(exported.json.format).toBe("k-coach-export/2");
  expect(exported.json.life.people[0].firstName).toBe("Camille");
  expect(exported.json.life.people[0].userId).toBeUndefined();
});
