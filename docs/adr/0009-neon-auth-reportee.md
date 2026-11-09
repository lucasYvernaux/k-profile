# 9. Neon Auth (Managed Better Auth) : migration reportée

Date : 2026-11-09

## Statut

Accepté

## Contexte

Proposition : déléguer l'authentification à Neon Auth, la version gérée de Better Auth proposée par
Neon (SDK `@neon/auth`, version 0.8.2 sur npm le 2026-11-09). Le service héberge les sessions et
stocke les utilisateurs dans un schéma `neon_auth` de la branche Neon.

Aujourd'hui, l'app utilise déjà Better Auth (1.7.18), auto-hébergé dans le Worker, avec ses tables
dans la même base Neon Postgres (via Hyperdrive, ADR 0008).

Constats relevés dans la documentation Neon le 2026-11-09 :

- **Pas de second facteur.** La feuille de route liste « MFA support : Coming soon »
  ([Managed Better Auth roadmap](https://neon.com/docs/auth/roadmap), mise à jour le 2026-09-17).
  Les plugins pris en charge sont Admin, Email OTP, JWT, Magic Link, OAuth Provider, Organization
  (partiel), Open API et Phone Number
  ([Plugins](https://neon.com/docs/auth/guides/plugins), mise à jour le 2026-10-30). Le plugin
  `twoFactor` n'en fait pas partie.
- **Plugins non configurables par l'app** : « You don't install or configure Better Auth plugins
  directly » (même page). On ne peut donc pas ajouter `twoFactor` soi-même.
- L'ADR 0003 impose un TOTP obligatoire avant tout accès aux données.

## Décision

On garde Better Auth auto-hébergé (ADR 0003 inchangée). La migration vers Neon Auth est reportée
jusqu'à ce que Neon prenne en charge un second facteur TOTP.

Option écartée : Neon Auth + TOTP codé dans l'app. Cela ajouterait du code d'authentification
sensible à maintenir, alors que Better Auth le fournit déjà.

## Conséquences

- Aucun changement de code. `auth: false` reste dans `neon.ts`.
- Toujours pas de réinitialisation du mot de passe ni de vérification d'e-mail (limites de
  l'ADR 0003), que Neon Auth aurait apportées.
- À revoir quand la feuille de route Neon annonce la MFA. Points à traiter alors :
  - migration des comptes existants (les tables métier référencent `user.id`, et les clés de
    chiffrement par utilisateur de l'ADR 0002 y sont liées) ;
  - compatibilité de `@neon/auth/next/server` avec Cloudflare Workers et le middleware Edge
    (non vérifiée) ;
  - adaptation de la CSP (`connect-src`) si le client appelle directement l'URL Neon Auth.
