# 6. Saisie quotidienne hors ligne

Date : 2026-11-09

## Statut

Accepté

## Contexte

Le brief demande un mode hors ligne pour la saisie quotidienne. Next.js 16.4 propose
`experimental.useOffline`, qui rejoue les Server Actions au retour du réseau, mais uniquement tant
que la page reste ouverte (état en mémoire). Mettre en cache les pages côté appareil y laisserait
des données sensibles déchiffrées.

## Décision

- Les saisies du jour (cases d'habitudes, priorités, sommeil/alcool, entrée de journal) passent
  toutes par `POST /api/sync`, en ligne comme hors ligne.
- Hors ligne, elles sont mises en file dans **IndexedDB** et rejouées dans l'ordre au retour du
  réseau. Chaque élément est idempotent (identifiant client pour le journal, upsert ailleurs).
- Le service worker (`public/sw.js`) met en cache les ressources statiques et **uniquement** la page
  « Aujourd'hui » et la page `/hors-ligne` (formulaire de journal sans historique). Le journal,
  l'audit et les revues ne sont jamais mis en cache.
- À la déconnexion et à la suppression du compte, la file et les caches `k-*` sont effacés.

## Conséquences

- Entre la saisie hors ligne et la synchronisation, l'entrée de journal est **en clair dans
  IndexedDB** sur l'appareil. Risque accepté pour un appareil personnel verrouillé ; documenté dans
  `docs/security/`.
- La page « Aujourd'hui » en cache contient les priorités du jour.
- Si la session a expiré au moment du rejeu, les éléments restent en file jusqu'à la reconnexion.
