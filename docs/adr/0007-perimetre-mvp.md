# 7. Périmètre livré du MVP et reports en V2

Date : 2026-11-09

## Statut

Accepté

## Contexte

Le brief liste 6 fonctionnalités MVP et 7 fonctionnalités V2. La première session vise le MVP
complet.

## Décision

Livré :

1. Onboarding Phase 0 (audit chiffré, base de comparaison).
2. Tracker d'habitudes : 2 en construction maximum, stabilité à 80 % sur 6 semaines (choix de
   conception), file de déblocage, pause, pas de série punitive, rappel « ne jamais rater 2 jours ».
3. Vue du jour : 3 priorités, cases d'habitudes, journée type modifiable.
4. Journal émotionnel : 3 émotions + contexte, historique, nuage.
5. Tableau de bord des 6 piliers et revue trimestrielle guidée avec graphique d'évolution.
6. Feuille de route : phase en cours, jalons, progression.

Livré en avance sur la V2, parce que peu coûteux ou exigé par le RGPD : signaux de vigilance
(sommeil, alcool, famille, jours ratés), rappel push du journal du soir, export JSON/CSV,
suppression du compte.

Reporté : saisie mensuelle du CA et alertes de seuils dans l'interface (la logique et les seuils
2026 paramétrables existent dans `src/domain/business.ts`, testés), module « cercle des 5 » avec
rappel mensuel, logs (sport, lectures, projets, compétence du mois), intégration Lichess, rappels
Big Five et revue trimestrielle par push, suivi psychologique optionnel (rappel de séances).

## Conséquences

- Les seuils micro ne sont pas encore affichés : le CA de l'audit couvre 12 mois glissants, alors
  que les seuils s'appliquent à l'année civile ; les comparer serait trompeur.
- Le pilier Maker n'a pas d'indicateur « projets livrés » tant que les logs ne sont pas faits.
