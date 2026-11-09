# 8. Déploiement sur Cloudflare Workers

Date : 2026-11-09

## Statut

Accepté

## Contexte

L'app doit être déployée sur Cloudflare Workers. Contraintes relevées dans la documentation le
2026-11-09 :

- **Adaptateur** : `@opennextjs/cloudflare` 1.20.16 accepte `next >=16.4.5` (peerDependencies npm).
  Cloudflare recommande vinext pour les *nouvelles* apps Next.js et OpenNext pour les apps
  existantes ([doc OpenNext sur Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)).
  vinext réimplémente l'API Next.js sur Vite ; OpenNext transforme la sortie du vrai `next build`.
- **Middleware Node.js non pris en charge** par OpenNext. Or le `proxy.ts` de Next.js 16 tourne
  toujours en Node.js ; le guide de migration v16 indique de garder `middleware` pour le runtime Edge.
- **Base de données** : Cloudflare indique que Drizzle + Postgres.js via Hyperdrive n'est pas
  supporté et recommande `pg` ; un client doit être créé par requête, sans pool global
  ([Hyperdrive + Drizzle](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/)).
- **CPU** : 10 ms par requête sur le plan gratuit, 30 s par défaut sur le plan payant.

## Décision

- OpenNext (`@opennextjs/cloudflare`), pour garder le vrai build Next.js et les tests existants.
- `src/proxy.ts` redevient `src/middleware.ts` (Edge, déprécié mais pris en charge) ; `Buffer`
  remplacé par `btoa`.
- Driver `pg`. `getDb()` renvoie un pool partagé sous Node.js, et sur Workers un `Client` unique par
  requête, lu depuis le binding `HYPERDRIVE` et mémorisé par `ExecutionContext`. Un `Pool` avec
  `maxUses: 1` (exemple OpenNext) produisait des erreurs « This socket has been closed » dans workerd.
- Better Auth instancié par requête autour de ce client ; IP client lue dans `cf-connecting-ip`.
- Worker personnalisé (`cloudflare/worker.ts`) : le handler `fetch` d'OpenNext plus un handler
  `scheduled` (Cron Trigger toutes les 10 minutes) qui appelle `/api/cron/reminders` avec
  `CRON_SECRET`.
- Variables non secrètes dans `wrangler.jsonc` (versionnées), secrets via `wrangler secret put`.
- Smart Placement activé pour rapprocher le Worker de la base.
- Pas de cache incrémental (R2) : toutes les pages sont dynamiques (ADR 0005).

## Conséquences

- La même base de code tourne sous Node.js (`next start`, 14 tests e2e) et dans workerd
  (`E2E_TARGET=workers`, les mêmes 14 tests).
- Next.js affiche un avertissement de dépréciation pour `middleware`. À revoir quand OpenNext
  prendra en charge le middleware Node.js.
- Plan Workers Paid nécessaire en pratique.
- Les données sont déchiffrées dans le Worker, sur le réseau Cloudflare : point RGPD à valider
  (voir `docs/security/protection-des-donnees.md`).
- L'envoi réel de notifications push via `web-push` (qui s'appuie sur `node:https`) n'a pas été
  testé dans workerd.
