# 1. Stack technique

Date : 2026-11-09

## Statut

Accepté

## Contexte

Le brief suggère Next.js (App Router) + TypeScript, PostgreSQL et une PWA installable. L'app est
personnelle au départ mais doit pouvoir s'ouvrir à d'autres utilisateurs. Elle stocke des données
de santé (journal émotionnel, sommeil, alcool), ce qui impose une authentification forte et un
chiffrement au repos.

Versions vérifiées sur le registre npm le 2026-11-09 : next 16.4.5, react 19.3, better-auth 1.7.18,
drizzle-orm 0.45.4, zod 4.6.7, vitest 5.1.0, @playwright/test 1.65.0. TypeScript 7.0 existe, mais
`create-next-app@16.4.5` installe TypeScript 5.9 ; on garde la 5.9 pour rester sur la combinaison
testée par Next.js.

## Décision

- **Next.js 16.4 App Router**, rendu serveur, Server Actions pour les formulaires en ligne,
  Route Handlers pour les API JSON (synchronisation hors ligne, export, push).
- **PostgreSQL 16** avec **Drizzle ORM** (requêtes typées, migrations SQL versionnées dans `drizzle/`).
- **Better Auth** pour l'authentification (bibliothèque maintenue plutôt qu'une auth maison,
  conformément à l'OWASP Authentication Cheat Sheet).
- **Zod** pour valider toutes les entrées côté serveur (et côté client quand c'est utile).
- **Tailwind CSS 4** avec des jetons de couleur contrôlés pour le contraste WCAG.
- **pnpm 10**, qui bloque par défaut les scripts d'installation des dépendances.
- Toutes les tables métier portent un `user_id` : l'ouverture multi-utilisateur ne demande pas de
  changement de schéma.
- La logique métier est en TypeScript pur dans `src/domain/` (aucune dépendance à Next.js ou à la
  base), testée avec Vitest.

## Conséquences

- La logique (déblocage des habitudes, alertes, seuils) se teste sans base ni navigateur.
- Next.js 16 diffère de versions plus anciennes (proxy au lieu de middleware, Cache Components) :
  la doc embarquée `node_modules/next/dist/docs/` fait foi (voir `AGENTS.md`).
- Le serveur Node.js est requis (pas d'export statique) : hébergement sur une plateforme qui
  exécute Node dans l'UE.
