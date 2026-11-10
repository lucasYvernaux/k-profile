# 14. Animations des chiffres avec React Bits

Date : 2026-11-10

## Statut

Accepté.

## Contexte

Le propriétaire a demandé d'animer les chiffres de l'application avec des composants de React Bits
(<https://reactbits.dev>, David Haz), dans un style sobre et élégant, avec deux règles : une seule
animation forte par écran, et aucune animation en boucle.

## Décision

Cinq composants, version TypeScript + Tailwind, copiés dans `src/shared/ui/react-bits/` :

| Composant | Écran | Comportement |
| --- | --- | --- |
| Count Up | Routine (jauge « Puissance », si la gamification est activée), Audit mensuel (« Score moyen ») | compte une fois jusqu'au score, 1,2 s, calé sur l'arc de la jauge |
| Counter | Réseau (Réseau, Cercle, En retard, Vus 7 j) | immobile au chargement (`intro={false}`) ; les chiffres roulent quand la valeur change |
| Blur Text | Santé (poids) | mise au point unique (`effect="focus"`), sans déplacement ni rebond |
| Fade Content | Tableau de bord (grille des 6 piliers) | apparition unique par mise au point, 0,8 s |
| Slosh Gauge | Consommations (hydratation) | remplace le récipient dessiné ; le liquide ne bouge que quand une prise est ajoutée, sans éclaboussure |

Adaptations :

- imports `motion/react` remplacés par `framer-motion` (déjà installé, mêmes fonctions) ;
- mises à jour de `ref` déplacées du rendu vers un effet (règle `react-hooks/refs` du projet) ;
- Count Up : la valeur finale seule est lue par les lecteurs d'écran (`sr-only`), pas chaque étape ;
- la flamme qui clignotait en boucle à côté de la série, sur Routine, est devenue fixe.

Nouvelle dépendance : `gsap` 3.15.0 (exigée par Fade Content). Licence « Standard no charge »
(<https://gsap.com/standard-license>).

Les cinq composants respectent `prefers-reduced-motion` : la valeur finale s'affiche directement.

## Licence

React Bits est sous licence « MIT + Commons Clause » (`src/shared/ui/react-bits/LICENSE.md`) :
utilisation autorisée dans une application, mention de copyright conservée dans chaque fichier ;
interdiction de vendre ou redistribuer les composants eux-mêmes.

## Conséquences

- Vérifié à 390 px de large (Playwright) : aucun défilement horizontal, chaque animation est
  arrêtée 3 s après l'ouverture, aucune animation infinie sur ces six écrans. Suite e2e : 32 tests
  passent, dont axe sur chaque écran.
- Fade Content cache la grille des piliers tant que le JavaScript n'a pas démarré (classe
  `invisible`). Si le script ne se charge pas, la grille reste invisible.
- Les composants copiés ne suivent pas les mises à jour de React Bits ; à refaire à la main si besoin.
- Le Manifeste garde deux flammes qui clignotent en boucle (`flicker`), hors périmètre de ce
  changement.
