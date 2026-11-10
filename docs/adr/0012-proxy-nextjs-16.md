# 12. Retour à `proxy.ts` (Next.js 16) à titre expérimental

Date : 2026-11-10

## Statut

Accepté, à l'essai sur la pré-production (`develop`). Remplace le point « `src/proxy.ts` redevient
`src/middleware.ts` » de l'ADR 0008.

## Contexte

Next.js 16 a renommé `middleware` en `proxy` et déprécié l'ancien nom. Le `proxy` tourne toujours
en Node.js : l'option `runtime` y est interdite
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, section
« Runtime »).

L'ADR 0008 avait gardé `middleware.ts` (Edge), car OpenNext ne prenait pas en charge un middleware
Node.js. La situation a évolué, mais les sources ne disent pas la même chose :

- la documentation Cloudflare (page OpenNext, mise à jour le 2026-10-12) indique toujours « Node.js
  in Middleware : Not yet supported »
  ([source](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)) ;
- `@opennextjs/cloudflare` 1.20.16, la version installée, sait regrouper un `proxy.ts`
  (`dist/cli/build/open-next/bundle-node-middleware.js`). Il affiche au build : « Node.js middleware
  support is experimental in cloudflare, and not officially maintained by OpenNext maintainers. Use
  at your own risk ».

Le propriétaire a demandé de passer à `proxy.ts`.

## Décision

- `src/middleware.ts` devient `src/proxy.ts`, et la fonction exportée devient `proxy`. Le contenu
  ne change pas : CSP à nonce et redirection optimiste vers `/connexion`.
- Le changement passe d'abord par `develop` (Worker Preview, ADR 0011). On ne fusionne dans `main`
  qu'après avoir vérifié la Preview :
  - en-tête `content-security-policy` avec un nonce sur une page ;
  - redirection de `/aujourdhui` vers `/connexion` sans session ;
  - connexion avec TOTP, puis navigation dans les modules.

## Conséquences

- Plus d'avertissement de dépréciation Next.js au build.
- Le proxy repose sur une fonction expérimentale, non maintenue officiellement par OpenNext. Si la
  Preview échoue, il faut revenir à `middleware.ts` (`git revert` du commit).
- L'autorisation ne dépend pas du proxy : elle est vérifiée dans chaque page, Server Action et Route
  Handler (ADR 0003). Une panne du proxy ferait perdre la CSP et la redirection, pas le contrôle
  d'accès aux données.
