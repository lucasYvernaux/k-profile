# Dépannage Cloudflare Workers

## « This socket has been closed » (pg dans workerd)

**Symptôme** : `unhandledRejection: TypeError: This socket has been closed`, puis une Server Action
qui échoue.
**Cause** : un `Pool` node-postgres avec `maxUses: 1` ferme ses clients pendant que le driver
Cloudflare lit encore la socket.
**Solution** : un seul `Client` par requête (`src/server/db/client.ts`), comme dans les exemples
Hyperdrive de Cloudflare.

## « The argument 'inputEncoding' … must be a Buffer »

**Cause** : dans workerd, `cipher.update(chaine)` sans encodage n'est pas accepté.
**Solution** : convertir explicitement en `Buffer.from(texte, "utf8")` (`src/server/crypto/cipher.ts`).

## Le build Next.js échoue sur `playwright.config.ts`

`next build` vérifie les types de tout le projet. Une erreur de type dans un fichier de
configuration de test fait échouer `opennextjs-cloudflare build`.

## `proxy.ts` sur Workers (expérimental)

Le `proxy` de Next.js 16 tourne en Node.js. OpenNext 1.20 le prend en charge à titre
expérimental : l'avertissement « Node.js middleware support is experimental in cloudflare » au build
est attendu (ADR 0012). Si la CSP ou la redirection vers `/connexion` disparaît sur Workers, revenir
à `src/middleware.ts` (Edge, fonction `middleware`), comme dans l'ADR 0008.

## Erreur 1102 « Worker exceeded resource limits »

Limite CPU dépassée. Vérifier que le compte est sur le plan Workers Paid (10 ms par requête sur le
plan gratuit). Voir **Metrics** du Worker (`exceededCpu`).

## Build Workers Builds : nom de Worker différent

Le `name` de `wrangler.jsonc` (`k-profile`) doit correspondre au nom du Worker dans le tableau de
bord.

## `wrangler dev` : « Unable to fetch the Request.cf object »

Avertissement sans conséquence quand la machine ne peut pas joindre l'API Cloudflare (réseau
restreint) : un objet `cf` par défaut est utilisé.

## 2FA : « Code invalide » (401 sur `/api/auth/two-factor/verify-totp`) en production

**Symptôme** (2026-11-09) : le code TOTP est refusé en production alors que le même parcours passe
dans les tests e2e.
**Cause probable** : cache des requêtes Hyperdrive, activé par défaut (`max_age` 60 s). Hyperdrive
n'invalide pas un `SELECT` en cache après une écriture. Si l'activation de la 2FA est relancée,
Better Auth écrit un nouveau secret, mais la lecture suivante peut renvoyer l'ancien. Les sessions
sont touchées de la même façon (une session révoquée peut rester valide jusqu'à 60 s).
Source : [Cloudflare, Query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/),
section « Read-after-write behavior ».
**Solution** : désactiver le cache sur la configuration Hyperdrive :

```bash
pnpm exec wrangler hyperdrive update <ID> --caching-disabled
```
