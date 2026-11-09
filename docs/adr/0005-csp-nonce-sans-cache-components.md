# 5. CSP stricte à nonce, sans Cache Components

Date : 2026-11-09

## Statut

Accepté

## Contexte

`create-next-app@16.4.5` active `cacheComponents` et `partialPrefetching`. La documentation
Next.js 16.4 (guide « Content Security Policy », section « Static vs Dynamic Rendering with CSP »)
indique que le Partial Prerendering est **incompatible** avec une CSP à nonce, car les scripts de la
coquille statique n'ont pas accès au nonce. Sans nonce, il faut `'unsafe-inline'` dans
`script-src`. Le même guide recommande les nonces quand l'application manipule des données
sensibles.

## Décision

- Désactiver `cacheComponents` et `partialPrefetching`.
- Générer un nonce par requête dans `src/middleware.ts` (middleware Edge, voir ADR 0008) ; CSP : `script-src 'self' 'nonce-…'
  'strict-dynamic'`, `style-src 'self' 'nonce-…'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`.
- Forcer le rendu dynamique de toutes les pages avec `await connection()` dans le layout racine.
- En-têtes complémentaires dans `next.config.ts` : HSTS, `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, COOP, CORP.

## Conséquences

- Chaque page est rendue à la demande (pas de cache CDN) : sans effet notable pour une app
  personnelle dont toutes les pages dépendent de l'utilisateur.
- En développement, `'unsafe-eval'` et `'unsafe-inline'` (styles) restent nécessaires (doc Next.js).
- `upgrade-insecure-requests` n'est ajouté que si `BETTER_AUTH_URL` est en HTTPS, pour que les
  tests e2e fonctionnent sur `http://localhost`.
