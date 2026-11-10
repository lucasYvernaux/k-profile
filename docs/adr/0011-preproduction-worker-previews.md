# 11. Pré-production : Worker Preview de la branche `develop`

Date : 2026-11-10

## Statut

Accepté

## Contexte

Jusqu'ici, `main` partait directement en production (Workers Builds, ADR 0008). La fusion de
NYX-KAIROS (ADR 0010) ajoute 23 tables et 11 écrans : le propriétaire veut un environnement de
pré-production avant la production.

Cloudflare propose les [Worker Previews](https://developers.cloudflare.com/workers/previews/)
(Wrangler 4.135 ou plus, le projet utilise 4.158) : chaque branche hors production obtient une
Preview du même Worker, avec ses propres variables, secrets et bindings. D'après la documentation
(consultée le 2026-11-10) :

- une Preview n'hérite d'aucun réglage de production : tout se déclare dans le bloc `previews` ;
- une liaison de service depuis une Preview appelle le Worker de **production** ;
- les Cron Triggers ne visent que la production ;
- l'URL d'une Preview est publique par défaut.

## Décision

1. Branches : `main` = production, `develop` = pré-production. Les branches de travail partent de
   `develop`.
2. La Preview `develop` utilise sa propre base, via la Hyperdrive `k-profile-db-dev` (branche Neon
   `develop`). Elle ne doit jamais atteindre les données de production. Cette branche Neon ayant été
   créée depuis `production`, ses données copiées sont effacées avant toute ouverture.
3. La Preview est servie sur le domaine de Preview
   `develop.k-profile.preview.yvernaux-web-solutions.com`, qui est aussi son `BETTER_AUTH_URL`.
4. Ses secrets (`BETTER_AUTH_SECRET`, `DATA_ENCRYPTION_KEY`) sont différents de ceux de la
   production et posés sur la configuration de base des Previews.
5. Le binding `WORKER_SELF_REFERENCE` n'est pas déclaré pour les Previews : il pointerait vers la
   production. OpenNext ne s'en sert que pour les files de revalidation, inutiles ici car toutes les
   pages sont dynamiques (ADR 0005).
6. Les URL de Preview sont protégées par Cloudflare Access.

## Conséquences

- Procédure : `docs/deploiement-cloudflare.md`, section 12.
- Chaque migration doit être appliquée sur deux bases (pré-production, puis production).
- Les rappels push (Cron) ne sont pas testables sur la Preview.
- **Non vérifié** :
  - un build Preview réel avec OpenNext (`pnpm cf:build` puis `npx wrangler preview`), car le build
    échoue sous Windows sans mode développeur ;
  - la validité de `placement` et `observability` dans `previews`. Le schéma Wrangler 4.158 les
    référence de façon incohérente, ils ont donc été laissés de côté.
