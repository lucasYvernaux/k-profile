# Dépannage Better Auth

## La CLI refuse le fichier de configuration

**Symptôme** : `pnpm dlx auth@1.7.18 generate` affiche « Please remove import 'server-only' from your
auth config file temporarily ».
**Solution** : commenter temporairement `import "server-only"` dans `src/server/auth.ts`,
`src/server/env.ts` et `src/server/db/client.ts`, lancer la commande avec les variables de
`.env.local` chargées, puis remettre les imports :

```bash
set -a; . ./.env.local; set +a
pnpm dlx auth@1.7.18 generate --config src/server/auth.ts --adapter drizzle --dialect postgresql --output src/server/db/auth-schema.ts -y
```

Puis `pnpm db:generate --name <nom>` et `pnpm db:migrate`.

## Type de retour de `twoFactor.enable`

Le retour est une union `{ method: "otp" } | { method: "totp", totpURI, backupCodes }`. Passer
`method: "totp"` et vérifier `data.method === "totp"` avant de lire `totpURI`.

## Inscription refusée

Normal si `ALLOW_SIGNUP=false`. Le passer à `true`, créer le compte, le remettre à `false`.

## Inscription en production : erreur 500 sur `/api/auth/sign-up/email`

**Symptôme** (2026-11-09) : le formulaire affiche « Inscription impossible » et la requête
`POST /api/auth/sign-up/email` répond 500. Les secrets du Worker sont pourtant présents.
**Cause** : migrations Drizzle jamais appliquées sur la base Neon. Le schéma `public` ne contenait
aucune table (`user`, `session`, `rate_limit`…), seul le schéma `neon_auth` existait.
**Solution** : appliquer les migrations sur la connexion directe (non poolée), étape 2 de
`docs/deploiement-cloudflare.md` :

```bash
pnpm db:migrate   # lit DATABASE_URL_UNPOOLED dans .env.local
```

Vérifier que `.env.local` vise la même base que Hyperdrive (`wrangler hyperdrive get <id>`).
