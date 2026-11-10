# 10. Fusion de NYX-KAIROS dans K

Date : 2026-11-09

## Statut

Accepté

## Contexte

NYX-KAIROS (dépôt GitLab `nyx_command_center`, version 1.1.3 du 2026-11-08) est un centre de
pilotage personnel : routine par phases, minuteurs d'entretien, consommations (eau, caféine,
alcool), santé (mensurations, séances), réseau de proches avec arbre familial, bilan quotidien et
émotions, revues hebdomadaire et mensuelle, objectifs et projets, manifeste, gamification. Même
socle que K : Next.js 16, React 19, Cloudflare Workers (OpenNext), PostgreSQL, Drizzle.

Le propriétaire veut n'utiliser que K à terme. Les deux projets diffèrent sur la sécurité :

| | NYX-KAIROS | K |
|---|---|---|
| Utilisateurs | un seul, aucune colonne propriétaire | plusieurs, isolation par `user_id` |
| Authentification | un mot de passe (hash dans un secret), sans second facteur | Better Auth + TOTP obligatoire (ADR 0003) |
| Données sensibles | en clair | AES-256-GCM, clé par utilisateur (ADR 0002) |
| Accès DB sur Workers | pilote HTTP Neon | `pg` + Hyperdrive (ADR 0008) |
| Écrans | composants client + API JSON | composants serveur + Server Actions |

Choix du propriétaire (2026-11-09) : migrer ses données NYX vers son compte K ; garder le modèle
d'habitudes, de journal et de revue de K et y ajouter ce qui manque ; gamification optionnelle,
désactivée par défaut.

## Décision

1. **Socle K conservé** : Better Auth + TOTP, chiffrement par utilisateur, `pg` + Hyperdrive,
   middleware Edge (CSP à nonce). L'authentification, le pilote Neon HTTP, le `proxy.ts` et l'import
   de sauvegarde de NYX ne sont pas repris (l'import effaçait toutes les tables).
2. **Schéma** (`src/server/db/life-schema.ts`, migration `0001_life_modules`) : 23 tables, chacune
   avec `user_id` (cascade à la suppression du compte). Les tables enfants référencent leur parent
   par `(user_id, parent_id)` : une ligne ne peut pas pointer vers les données d'un autre compte,
   même après une erreur applicative (défense en profondeur, OWASP A01).
3. **Chiffrement transparent** (`src/server/crypto/sealed-columns.ts`) : les colonnes sensibles
   (santé, alcool, réseau, émotions, bilans, revues, objectifs, réglages) sont des colonnes
   `sealed()`. Drizzle chiffre à l'écriture et déchiffre à la lecture avec la clé de l'utilisateur
   de la requête, chargée par `withUserData()` dans un `AsyncLocalStorage`. Hors de ce contexte,
   tout accès lève une erreur (échec fermé). Restent en clair : identifiants, dates, types,
   indicateurs utiles aux requêtes. Une colonne chiffrée n'est jamais comparée ni triée en SQL.
4. **API** : les écrans NYX gardent leur API JSON. L'enveloppe `route()` vérifie l'origine (CSRF),
   exige un utilisateur avec TOTP (`apiUser`), valide tout avec zod, limite la taille des corps et
   exécute le service dans `withUserData()`. Chaque requête de service filtre sur `currentUserId()`.
   Deux styles coexistent donc (Server Actions pour K, API JSON pour les modules repris) : réécrire
   14 écrans aurait coûté plus cher et ajouté du risque.
5. **Modules en doublon** :
   - habitudes : celles de K seulement. Les habitudes NYX sont migrées comme habitudes K « en
     pause » avec leurs jours cochés ;
   - journal : le journal émotionnel K reste ; le bilan quotidien et les émotions détaillées de NYX
     deviennent « Bilan du jour » (`/bilan`, API `/api/logbook`) ;
   - revues : la revue trimestrielle K reste ; la revue hebdomadaire et l'audit mensuel NYX
     s'ajoutent ;
   - tableau de bord NYX : remplacé par la page « Routine » (phase en cours, Pomodoro, citation,
     entretien à faire, piliers).
6. **Piliers** : les 6 piliers de K. Correspondance NYX → K : forge → corps, académie et artisanat →
   maker, conseil → famille, économie → stratégie, gouvernement → mental.
7. **Gamification** : score quotidien recalculé à partir des habitudes K (en formation ou stables,
   70 %) et des phases de routine (30 %) ; badges réévalués sur les données qui existent encore.
   Toujours calculée, affichée seulement si l'utilisateur l'active dans Réglages (désactivée par
   défaut, car les séries contredisent le principe « pas de série qui casse » de K).
8. **Interface** : les écrans NYX sont affichés dans une zone sombre (`.life-zone`). Leurs couleurs
   ont été vérifiées AA uniquement sur fond sombre ; cette zone garde donc ces contrastes quel que
   soit le thème du système. Navigation groupée (barre latérale, bouton « Menu » sur mobile).
9. **Données** : script unique `scripts/migrate-nyx.ts` (base NYX en lecture seule, exécution à
   blanc par défaut, une transaction, refus si le compte a déjà des données de ces modules).

## Conséquences

- Export RGPD : format `k-coach-export/2`, avec les modules repris déchiffrés (`life`).
  Suppression du compte : tout part en cascade.
- Vérifié le 2026-11-09 : 153 tests unitaires, 32 tests e2e (dont axe WCAG 2.2 A/AA en clair et
  sombre sur les 11 nouvelles pages, chiffrement en base, isolation entre deux comptes, CSRF),
  migration sur une base NYX de test.
- **Non vérifié** : le build et l'exécution dans workerd (`pnpm cf:build` échoue sous Windows sans
  mode développeur, voir `docs/troubleshooting/cloudflare-workers.md`). `AsyncLocalStorage` est
  indiqué « supported » par Cloudflare
  ([Node.js APIs](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)), à confirmer
  avec `E2E_TARGET=workers pnpm test:e2e` depuis WSL ou Workers Builds.
- Dette :
  - convertir les couleurs NYX en jetons clair/sombre ;
  - découper les gros écrans NYX (règles React Compiler en avertissement pour eux seulement,
    `eslint.config.mjs`) ;
  - « Journée type » (K) et « Routine » (NYX) décrivent toutes deux la journée : à unifier ;
  - l'horloge métier des modules NYX est fixée à `Europe/Paris` (`src/server/time.ts`), alors que K
    stocke un fuseau par utilisateur.
- Après migration des données : arrêter le Worker NYX, supprimer ses secrets et sa base Neon.
