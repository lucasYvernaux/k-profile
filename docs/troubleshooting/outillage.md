# Dépannage outillage

## `web-push` : « Export default doesn't exist »

`web-push` 4.0.0 n'a plus d'export par défaut. Importer les fonctions nommées :
`import { sendNotification, setVapidDetails } from "web-push"`.

## Playwright : « Executable doesn't exist »

Le navigateur attendu par `@playwright/test` 1.65 n'est pas installé. Soit `pnpm exec playwright
install chromium`, soit pointer vers un Chromium existant :

```bash
PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chrome pnpm test:e2e
```

## La base e2e refuse d'être réinitialisée

`scripts/e2e-db.ts` refuse toute base dont le nom ne finit pas par `_test`, pour protéger les
vraies données. Définir `E2E_DATABASE_URL` vers une base `…_test`.

## drizzle-kit : clé étrangère composite créée avant son index unique

**Symptôme** : la migration générée contient `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY
("user_id","a_id") REFERENCES "person"("user_id","id")` avant
`CREATE UNIQUE INDEX … ON "person" ("user_id","id")`. PostgreSQL refuse alors la clé étrangère
(aucune contrainte unique sur les colonnes référencées).

**Cause** : drizzle-kit 0.31 écrit les clés étrangères avant les index.

**Correctif** : déclarer `unique("…").on(t.userId, t.id)` (contrainte dans le `CREATE TABLE`)
plutôt que `uniqueIndex()` pour les colonnes référencées (`src/server/db/life-schema.ts`).

## Tests e2e : contraste signalé pendant une animation

**Symptôme** : axe signale `color-contrast` sur des éléments des écrans NYX, en mode clair
seulement (le premier analysé).

**Cause** : framer-motion fait apparaître les éléments en fondu ; axe mesure une couleur à moitié
transparente.

**Correctif** : attendre la fin des animations (< 1 s) avant l'analyse (`tests/e2e/life.spec.ts`).
