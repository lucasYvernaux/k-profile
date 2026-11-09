import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { expectAccessible, totp } from "./helpers";

/*
 * Key journey, in order: sign-up, mandatory 2FA, Phase 0 audit, habits with
 * the "2 at a time" rule, daily view, journal (online and offline), roadmap,
 * quarterly review, dashboard, export, sign-in again, account deletion.
 */
const EMAIL = "k-e2e@example.com";
const PASSWORD = "une phrase de passe assez longue";
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://k:k_dev_password@localhost:5432/k_test";

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;
let totpSecret = "";

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris" });
  page = await context.newPage();
});

test.afterAll(async () => {
  await context.close();
});

test("protected pages redirect to sign-in", async () => {
  await page.goto("/journal");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();
  await expectAccessible(page);
});

test("sign-up then mandatory TOTP enrolment", async () => {
  await page.goto("/inscription");
  await expectAccessible(page);
  await page.getByLabel("Prénom ou pseudo").fill("Lucas");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer le compte" }).click();

  await expect(page).toHaveURL(/\/securite\/2fa$/);
  // Data pages stay closed until 2FA is enabled.
  await page.goto("/aujourdhui");
  await expect(page).toHaveURL(/\/securite\/2fa$/);

  await page.getByLabel("Confirme ton mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Commencer l'activation" }).click();
  totpSecret = (await page.locator("code").first().textContent()) ?? "";
  expect(totpSecret).toMatch(/^[A-Z2-7]+=*$/);
  await expectAccessible(page);
  await page.getByLabel("Code à 6 chiffres").fill(totp(totpSecret));
  await page.getByRole("button", { name: "Activer la double authentification" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("Phase 0 audit becomes the baseline", async () => {
  await expectAccessible(page);
  await page.getByLabel("Taux journalier moyen (€)").fill("450");
  await page.getByLabel("Épargne de sécurité disponible (€)").fill("9000");
  await page.getByLabel("Dépenses mensuelles (€)").fill("2000");
  await page.getByLabel("Proche 1").fill("Dom");
  await page.getByRole("button", { name: "Enregistrer mon point de départ" }).click();
  await expect(page).toHaveURL(/\/aujourdhui$/);
  await expect(page.getByText(/Phase 0 : Audit/)).toBeVisible();
});

test("only two habits can be in formation", async () => {
  await page.getByRole("button", { name: "Débloquer « Lever et coucher à heure fixe »" }).click();
  await expect(page.getByRole("button", { name: "Débloquer « Musculation »" })).toBeVisible();
  await page.getByRole("button", { name: "Débloquer « Musculation »" }).click();
  await expect(page.getByRole("heading", { name: "Une place est libre" })).toHaveCount(0);

  await page.goto("/habitudes");
  await expect(page.getByRole("heading", { name: "En construction (2/2)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Débloquer « Journal du soir (3 émotions) »" })).toBeDisabled();
  await expectAccessible(page);
});

test("daily view: check a habit, set priorities and sleep", async () => {
  await page.goto("/aujourdhui");
  const habit = page.getByRole("checkbox", { name: "Lever et coucher à heure fixe" });
  await habit.check();
  await expect(page.getByRole("status").filter({ hasText: "Enregistré." }).first()).toBeVisible();

  await page.getByLabel("Priorité 1").fill("Livrer la maquette client");
  await page.getByRole("button", { name: "Enregistrer les priorités" }).click();
  await page.getByLabel("Sommeil la nuit dernière (heures)").fill("7.5");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Lever et coucher à heure fixe" })).toBeChecked();
  await expect(page.getByLabel("Priorité 1")).toHaveValue("Livrer la maquette client");
  await expect(page.getByLabel("Sommeil la nuit dernière (heures)")).toHaveValue("7.5");
  await expectAccessible(page);
});

test("emotion journal: validation, entry and cloud", async () => {
  await page.goto("/journal");
  await page.getByLabel("Émotion 1").fill("très content");
  await page.getByLabel("Émotion 2").fill("calme");
  await page.getByLabel("Émotion 3").fill("fierté");
  await page.getByRole("button", { name: "Enregistrer l'entrée" }).click();
  await expect(page.getByText("Un seul mot, sans espace ni chiffre (40 caractères max).")).toBeVisible();

  await page.getByLabel("Émotion 1").fill("Joie");
  await page.getByLabel("Pourquoi ? Contexte").fill("Projet livré à temps.");
  await page.getByRole("button", { name: "Enregistrer l'entrée" }).click();
  await expect(page.getByRole("heading", { level: 3, name: /joie, calme, fierté/ })).toBeVisible();
  await expect(page.getByRole("list", { name: /Nuage des émotions/ })).toContainText("fierté");
  await expectAccessible(page);
});

test("journal entries made offline are synced when back online", async () => {
  await context.setOffline(true);
  await page.getByLabel("Émotion 1").fill("fatigue");
  await page.getByLabel("Émotion 2").fill("calme");
  await page.getByLabel("Émotion 3").fill("gratitude");
  await page.getByRole("button", { name: "Enregistrer l'entrée" }).click();
  await expect(page.getByText("Gardé sur cet appareil, envoi au retour du réseau.")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("heading", { level: 3, name: /fatigue, calme, gratitude/ })).toBeVisible({ timeout: 15_000 });
});

test("journal content is encrypted at rest", async () => {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const rows = await sql<{ payload_enc: string }[]>`SELECT payload_enc FROM journal_entry`;
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.payload_enc).toMatch(/^v1\./);
      expect(row.payload_enc).not.toContain("calme");
    }
  } finally {
    await sql.end();
  }
});

test("roadmap milestones can be ticked", async () => {
  await page.goto("/feuille-de-route");
  await page.getByRole("button", { name: "Marquer atteint : Liste des proches" }).click();
  await expect(page.getByRole("button", { name: "Annuler : Liste des proches" })).toBeVisible();
  await expectAccessible(page);
});

test("quarterly review feeds the evolution chart", async () => {
  await page.goto("/revue");
  const scores = { "Maîtrise émotionnelle": "5", Corps: "6", Maker: "4", "Stratégie, business, argent": "5", "Famille choisie": "7", "Présence et style": "3" };
  for (const [label, score] of Object.entries(scores)) {
    await page.getByLabel(label, { exact: true }).fill(score);
  }
  await page.getByLabel(/Qu'est-ce qui a fonctionné/).fill("Sommeil plus régulier.");
  await page.getByRole("button", { name: /Enregistrer la revue/ }).click();
  await expect(page.getByText(/Revue \d{4}-Q\d enregistrée\./)).toBeVisible();
  await expect(page.getByRole("img", { name: /^Corps : \d{4}-Q\d 6 sur 10$/ })).toBeVisible();
  await expectAccessible(page);

  await page.goto("/tableau-de-bord");
  await expect(page.getByText("Jours de journal ce mois-ci")).toBeVisible();
  await expectAccessible(page);
});

test("settings: export decrypted data", async () => {
  await page.goto("/reglages");
  await expectAccessible(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export complet (JSON)" }).click(),
  ]);
  const data = JSON.parse(await readFile((await download.path()) ?? "", "utf8"));
  expect(data.format).toBe("k-coach-export/1");
  expect(data.journal).toHaveLength(2);
  expect(data.audits[0].data.business.dailyRate).toBe(450);
});

test("security headers and API guards", async () => {
  const response = await page.goto("/aujourdhui");
  const csp = response?.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");

  // Cross-origin POST is refused even with a valid session cookie.
  const crossOrigin = await page.request.post("/api/sync", {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: { items: [] },
  });
  expect(crossOrigin.status()).toBe(403);
  const cron = await page.request.post("/api/cron/reminders");
  expect(cron.status()).toBe(401);
});

test("sign out, wrong password, sign in with TOTP", async () => {
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill("mauvais mot de passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email ou mot de passe incorrect." })).toBeVisible();

  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/connexion\/2fa$/);
  await expectAccessible(page);
  // Wait for a fresh TOTP window so the code is never a replay of the enrolment code.
  await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500);
  await page.getByLabel("Code à 6 chiffres").fill(totp(totpSecret));
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page).toHaveURL(/\/aujourdhui$/);
});

test("account deletion removes everything", async () => {
  await page.goto("/reglages");
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByLabel("Écris SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page).toHaveURL(/\/$/);

  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT (SELECT count(*) FROM "user") + (SELECT count(*) FROM journal_entry)
           + (SELECT count(*) FROM user_key) + (SELECT count(*) FROM audit) AS count`;
    expect(Number(count)).toBe(0);
  } finally {
    await sql.end();
  }
});
