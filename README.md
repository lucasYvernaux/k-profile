# K, coach de développement personnel

Application personnelle pour construire, sur 4 à 5 ans, la version saine du « profil K » :
6 piliers (maîtrise émotionnelle, corps, maker, stratégie/business/argent, famille choisie,
présence et style), 2 habitudes en construction à la fois, journal émotionnel, revue trimestrielle
et feuille de route.

Principes : pas de série qui casse, pas de culpabilisation, pas de diagnostic ni de conseil fiscal
ou financier, et aucun chiffre scientifique sans source (`src/domain/sources.ts`).

## Fonctionnalités (MVP)

- Onboarding Phase 0 : audit chiffré qui sert de point de départ.
- Habitudes : 2 en construction maximum, déblocage de la suivante à 80 % de régularité sur
  6 semaines (choix de conception), rappel « ne jamais rater 2 jours d'affilée ».
- Vue du jour : 3 priorités, habitudes à cocher, sommeil et alcool, journée type modifiable,
  signaux de vigilance.
- Journal émotionnel : 3 émotions en un mot + contexte, historique, nuage des émotions.
- Tableau de bord des 6 piliers, revue trimestrielle guidée avec graphiques d'évolution.
- Feuille de route sur 5 ans avec jalons.
- PWA installable, saisie quotidienne hors ligne, rappel push du journal du soir.
- Export JSON/CSV et suppression du compte.

Ce qui est reporté en V2 : voir `docs/adr/0007-perimetre-mvp.md`.

## Stack

Next.js 16.4 (App Router) · React 19 · TypeScript 5.9 · PostgreSQL 16 + Drizzle ORM (pg) ·
Cloudflare Workers (OpenNext, Hyperdrive) ·
Better Auth (mot de passe + TOTP) · Zod · Tailwind CSS 4 · Vitest · Playwright + axe-core · pnpm 10.

## Démarrer en local

Prérequis : Node.js 22, pnpm 10, PostgreSQL 16 (ou Docker).

```bash
pnpm install
```

```bash
docker compose up -d
```

```bash
cp .env.example .env.local
```

Remplir `.env.local` (générer les secrets avec `openssl rand -base64 48` et la clé de données
avec `openssl rand -base64 32`), mettre `ALLOW_SIGNUP=true` pour créer le premier compte, puis :

```bash
pnpm db:migrate
```

```bash
pnpm dev
```

Créer le compte sur http://localhost:3000/inscription, activer la double authentification, puis
remettre `ALLOW_SIGNUP=false`.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` / `pnpm start` | Build et serveur de production |
| `pnpm lint` / `pnpm typecheck` | ESLint et TypeScript |
| `pnpm test` | Tests unitaires (logique métier, chiffrement, CSV) |
| `pnpm test:e2e` | Tests e2e : réinitialise la base `k_test` puis lance Playwright (faire `pnpm build` avant) |
| `pnpm db:generate` / `pnpm db:migrate` | Migrations Drizzle |

## Déploiement sur Cloudflare Workers

Guide pas à pas : [`docs/deploiement-cloudflare.md`](docs/deploiement-cloudflare.md)
(OpenNext, Hyperdrive, secrets, Workers Builds depuis GitHub). Décisions : ADR 0008. Neon Auth reportée : ADR 0009.

| Commande | Rôle |
|---|---|
| `pnpm cf:build` | Build pour Workers (`.open-next/`) |
| `pnpm cf:preview` | Build puis exécution locale dans workerd |
| `pnpm cf:deploy` | Build puis déploiement sur Cloudflare |
| `E2E_TARGET=workers pnpm test:e2e` | Tests e2e dans workerd (après `pnpm cf:build`) |

## Rappels push

Générer des clés VAPID (`npx web-push generate-vapid-keys`). Sur Cloudflare, le Cron Trigger de
`wrangler.jsonc` appelle la route toutes les 10 minutes. Ailleurs, la faire appeler toutes les 5 à
15 minutes par un planificateur externe :

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/reminders
```

## Sécurité et données

- Données sensibles chiffrées en AES-256-GCM avec une clé par utilisateur (ADR 0002).
- TOTP obligatoire avant tout accès aux données (ADR 0003).
- CSP stricte à nonce et en-têtes de sécurité (ADR 0005).
- Correspondance OWASP Top 10:2025 : `docs/security/owasp-top-10-2025.md`.
- RGPD, hébergement UE (fournisseur non choisi), données sur l'appareil :
  `docs/security/protection-des-donnees.md`.
- **Sauvegarder `DATA_ENCRYPTION_KEY` hors de la base** : sans elle, les données sont perdues.

## Documentation

- `docs/adr/` : décisions d'architecture (format Michael Nygard).
- `docs/dev-log/AAAA-MM.md` : journal de développement mensuel.
- `docs/troubleshooting/` : problèmes rencontrés et solutions.
- `docs/security/` : sécurité, secrets, protection des données.

## Conventions

- Commits : [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), signés.
- Branches : [Conventional Branch](https://conventionalbranch.org/) (`feature/…`, `bugfix/…`, `hotfix/…`, `release/…`, `chore/…`).
- Code : principes de [clean-code-javascript](https://github.com/ryanmcdermott/clean-code-javascript).
- Accessibilité : WCAG 2.2 AA, vérifiée par axe-core dans les tests e2e (modes clair et sombre).
