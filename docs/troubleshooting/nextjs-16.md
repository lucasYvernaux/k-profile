# Dépannage Next.js 16.4

## CSP à nonce et Cache Components

**Symptôme** : avec `cacheComponents: true` (défaut de `create-next-app@16.4.5`), une CSP
`script-src 'nonce-…'` bloque les scripts de la coquille pré-rendue.
**Cause** : le Partial Prerendering est incompatible avec les nonces (doc embarquée, guide CSP).
**Solution** : voir ADR 0005, `cacheComponents` désactivé et `await connection()` dans le layout racine.

## `Cannot apply unknown utility class 'btn'` (Tailwind 4)

**Cause** : Tailwind 4 n'accepte pas `@apply` sur une classe définie dans `@layer components`.
**Solution** : déclarer les classes réutilisables avec `@utility nom { … }` (voir `globals.css`).

## Titre de document vide pendant un rafraîchissement

**Symptôme** : axe signale `document-title` juste après l'envoi d'un formulaire qui appelle
`router.refresh()`.
**Cause** : la balise `<title>` est remplacée pendant la transition.
**Solution** (tests) : attendre `expect(page).toHaveTitle(/.+/)` avant l'analyse. Ne pas attendre
`networkidle`, qui n'arrive jamais sur ces pages.

## Avertissement `no-location-assign-relative-destination`

Utiliser `useRouter().push()` dans les gestionnaires d'événements plutôt que
`window.location.assign()`.
