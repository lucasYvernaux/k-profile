# 15. Nom « Hespéride » et logo

Date : 2026-11-10

## Statut

Accepté.

## Contexte

L'application s'appelait « K », comme le « profil K » qu'elle aide à construire. Le propriétaire a
demandé un nom lié à la déesse Nyx, et un logo qui représente le mode de vie plutôt que le nom.

Source mythologique : Theoi Project, fiche « Nyx » (<https://www.theoi.com/Protogenos/Nyx.html>),
qui cite Hésiode, *Théogonie* 211-225 : seule, Nyx (la Nuit) enfante notamment les Hespérides et
les Moires.

## Décision

- Nom affiché : **Hespéride**. Les Hespérides sont les nymphes du soir, filles de Nyx : lien avec
  le rituel du soir de l'application (journal, revues) et la charte noir et or (ADR 0013).
- « Profil K » reste le nom du profil visé : c'est le concept de coaching, pas l'application.
- Logo : rosace de six branches identiques autour d'un noyau, une branche par pilier
  (`src/domain/pillars.ts`), toutes de même taille pour dire l'équilibre. Or uni, sans couleur par
  pilier : à 32 px, six couleurs deviennent illisibles et sortiraient de la charte.
  - Source unique : `public/logo.svg` ; même dessin en ligne dans `src/components/logo.tsx`
    (`currentColor`).
  - Icônes PNG (favicon, Apple, PWA, maskable) régénérées depuis ce dessin.
- Renommés : titre et modèle de titre, manifeste PWA, en-tête, accueil, pied de page, textes qui
  nomment l'application, titre des notifications, `appName` et émetteur TOTP de Better Auth.

## Conséquences

- Les comptes déjà enrôlés gardent l'étiquette « K » dans leur application d'authentification ;
  les codes restent valides. Les nouveaux enrôlements affichent « Hespéride ».
- Noms techniques inchangés : paquet `k-coach`, dépôt et Worker `k-profile`, domaine, base
  IndexedDB et caches `k-*` (les renommer viderait la file de saisies hors ligne), format
  d'export `k-coach-export/2` (compatibilité des sauvegardes).
- Disponibilité du nom comme marque : non vérifiée (je ne sais pas si « Hespéride » est déposé).
