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
