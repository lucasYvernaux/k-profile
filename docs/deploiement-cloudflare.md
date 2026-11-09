# Déployer K sur Cloudflare Workers

Ce guide déploie l'app sur Cloudflare Workers avec l'adaptateur OpenNext, une base PostgreSQL
hébergée dans l'UE et Hyperdrive. Les décisions techniques sont expliquées dans
`docs/adr/0008-deploiement-cloudflare-workers.md`.

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié le 2026-11-09, en local dans `workerd` (le runtime de Workers, via `wrangler dev`) :

- les 14 tests e2e passent (inscription, 2FA, audit, habitudes, journal en ligne et hors ligne,
  chiffrement au repos, revue, export, en-têtes de sécurité, suppression du compte) ;
- le Cron Trigger appelle bien la route des rappels ;
- taille du bundle : 18,3 Mio non compressés, sous la limite de 64 Mio par Worker
  ([changelog Cloudflare, 4 septembre 2026](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/)).

**Non vérifié** :

- un déploiement réel sur le réseau Cloudflare ;
- l'envoi réel d'une notification push par `web-push` depuis Workers (aucun abonnement push réel
  disponible pendant les tests) ;
- la consommation CPU réelle par requête en production.

## 0. Prérequis

1. **Un compte Cloudflare avec le plan Workers Paid.** Le plan gratuit limite le CPU à 10 ms par
   requête, contre 30 s par défaut sur le plan payant
   ([limites Workers](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)).
   Cloudflare indique que les applications avec rendu serveur ont généralement besoin du plan
   payant ([guide de migration Vercel](https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/)).
   Le hachage du mot de passe (scrypt) et le rendu des pages dépassent très probablement 10 ms.
   Prix affiché par Cloudflare : 5 $ par mois d'abonnement, plus l'usage au-delà du quota inclus
   ([tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/)).
2. **Une base PostgreSQL managée, hébergée dans l'UE, accessible en TLS.** Choisis un fournisseur
   qui propose une région UE et vérifie la région au moment de créer la base. Hyperdrive se
   connecte à la base depuis les [plages IP de Cloudflare](https://www.cloudflare.com/ips/) : si la
   base a un pare-feu, autorise ces plages.
3. **En local** : Node.js 22, pnpm 10, le dépôt cloné et `pnpm install` exécuté.

## 1. Préparer la base de données

Applique les migrations sur la base de production depuis ta machine. Remplace l'URL par celle de
ton fournisseur et garde `sslmode=require` :

```bash
DATABASE_URL="postgres://UTILISATEUR:MOT_DE_PASSE@HOTE:5432/BASE?sslmode=require" pnpm db:migrate
```

## 2. Générer les secrets

Génère chaque valeur et range-la dans ton gestionnaire de mots de passe. **Sauvegarde
`DATA_ENCRYPTION_KEY` à part** : sans elle, les données chiffrées sont perdues.

```bash
openssl rand -base64 48
```

(à faire deux fois : une pour `BETTER_AUTH_SECRET`, une pour `CRON_SECRET`)

```bash
openssl rand -base64 32
```

(pour `DATA_ENCRYPTION_KEY`)

```bash
pnpm exec web-push generate-vapid-keys
```

(clés publique et privée pour les rappels push, facultatif)

## 3. Se connecter à Cloudflare depuis le terminal

```bash
pnpm exec wrangler login
```

## 4. Créer la configuration Hyperdrive

```bash
pnpm exec wrangler hyperdrive create k-profile-db --connection-string="postgres://UTILISATEUR:MOT_DE_PASSE@HOTE:5432/BASE?sslmode=require"
```

La commande affiche un `id`. Copie-le dans `wrangler.jsonc`, à la place de
`00000000000000000000000000000000` dans le bloc `hyperdrive`.

## 5. Adapter `wrangler.jsonc`

Dans le bloc `vars` :

- `ALLOW_SIGNUP` : mets `"true"` pour le premier déploiement, le temps de créer ton compte.
- `VAPID_PUBLIC_KEY` et `VAPID_SUBJECT` (par exemple `mailto:toi@exemple.fr`) si tu veux les rappels
  push. Sinon, laisse-les vides.
- `BETTER_AUTH_URL` : l'URL publique de l'app. Tu la connaîtras après le premier déploiement
  (`https://k-profile.<ton-sous-domaine>.workers.dev`) ou si tu utilises ton propre domaine.

Ne mets **aucun secret** dans ce fichier : il est versionné dans Git.

## 6. Premier déploiement (crée le Worker)

```bash
pnpm cf:deploy
```

Note l'URL `https://k-profile.<ton-sous-domaine>.workers.dev` affichée à la fin. Reporte-la dans
`BETTER_AUTH_URL` (`wrangler.jsonc`) si ce n'était pas déjà fait, puis redéploie.

## 7. Enregistrer les secrets

Chaque commande demande la valeur dans le terminal ; elle n'apparaît pas dans l'historique du shell.

```bash
pnpm exec wrangler secret put BETTER_AUTH_SECRET
```

```bash
pnpm exec wrangler secret put DATA_ENCRYPTION_KEY
```

```bash
pnpm exec wrangler secret put CRON_SECRET
```

```bash
pnpm exec wrangler secret put VAPID_PRIVATE_KEY
```

Ne définis **pas** `DATABASE_URL` sur Cloudflare : sur Workers, l'app passe uniquement par
Hyperdrive.

## 8. Créer ton compte

1. Ouvre `https://k-profile.<ton-sous-domaine>.workers.dev/inscription` et crée le compte.
2. Active la double authentification (obligatoire), garde les codes de secours.
3. Remets `ALLOW_SIGNUP` à `"false"` dans `wrangler.jsonc`, commite et redéploie (ou pousse sur
   `main` si l'étape 9 est faite).

## 9. Déploiement automatique à chaque push (Workers Builds)

Une fois le Worker créé (étape 6), relie-le au dépôt GitHub
([doc Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)) :

1. Tableau de bord Cloudflare → **Workers & Pages** → Worker `k-profile`.
2. **Settings** → **Builds** → **Connect**, puis choisis le dépôt `lucasYvernaux/k-profile`.
3. Paramètres de build :
   - **Git branch** : `main`
   - **Build command** : `pnpm cf:build`
   - **Deploy command** : `npx wrangler deploy` (valeur par défaut)
   - **Root directory** : vide
4. Aucune variable de build n'est nécessaire : le build ne lit aucun secret (vérifié en local
   sans fichier `.env`).

Le nom du Worker dans le tableau de bord doit être identique au `name` de `wrangler.jsonc`
(`k-profile`), sinon le build échoue
([dépannage Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/#workers-name-requirement)).

### Erreur « When developing locally, you should use a local Postgres connection string »

Pendant le déploiement, `opennextjs-cloudflare deploy` démarre un runtime Workers **local**
(`getPlatformProxy` de Wrangler). Wrangler refuse alors un binding Hyperdrive sans base locale.
C'est pourquoi le bloc `hyperdrive` de `wrangler.jsonc` contient un `localConnectionString`
factice (`localhost`) : il ne sert qu'en local et n'est jamais utilisé en production. La variable
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` le remplace quand elle est définie
([doc Hyperdrive, développement local](https://developers.cloudflare.com/hyperdrive/configuration/local-development/)).

## 10. Vérifier

- Les en-têtes de sécurité :

```bash
curl -sI https://k-profile.<ton-sous-domaine>.workers.dev/connexion
```

  On doit voir `content-security-policy` avec un `nonce`, `strict-transport-security` et
  `x-frame-options: DENY`.

- Les journaux en direct, par exemple pendant le passage du Cron Trigger (toutes les 10 minutes) :

```bash
pnpm exec wrangler tail k-profile
```

- Dans le tableau de bord : **Workers & Pages** → `k-profile` → **Metrics** pour le temps CPU et
  les erreurs (`exceededCpu` signale un dépassement de la limite CPU).

## 11. Domaine personnalisé (facultatif)

Si tu as un domaine géré par Cloudflare : Worker `k-profile` → **Settings** → **Domains & Routes**.
Mets ensuite `BETTER_AUTH_URL` à jour avec ce domaine et redéploie : l'authentification refuse les
requêtes dont l'origine ne correspond pas.

## Développer et tester en local dans le runtime Workers

```bash
pnpm cf:build
```

```bash
E2E_TARGET=workers PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chrome pnpm test:e2e
```

La seconde commande lance `wrangler dev` sur la base locale `k_test` (Hyperdrive pointé vers elle
via `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`) et rejoue les 14 tests e2e.
`PLAYWRIGHT_CHROMIUM_PATH` est facultatif.

## Protection des données

L'app traite des données de santé. Sur Cloudflare :

- les données sont stockées dans la base PostgreSQL de l'UE, chiffrées par l'app (ADR 0002) ;
- elles sont **déchiffrées en mémoire dans le Worker**, qui tourne sur le réseau de Cloudflare.
  Smart Placement rapproche le Worker de la base, mais ce n'est pas une garantie de localisation ;
- Cloudflare est une entreprise américaine. Avant la mise en production, **à vérifier** : l'accord
  de traitement des données (DPA) de Cloudflare et l'encadrement des transferts hors UE.
  Voir aussi `docs/security/protection-des-donnees.md`.

Je ne sais pas si ce montage satisfait toutes tes obligations RGPD pour des données de santé :
c'est à faire valider (juriste ou DPO), surtout avant d'ouvrir l'app à d'autres personnes.
