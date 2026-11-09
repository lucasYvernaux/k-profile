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
