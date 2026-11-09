# 4. Big Five : saisie de scores issus d'un test externe

Date : 2026-11-09

## Statut

Accepté

## Contexte

La Phase 0 demande un test Big Five (IPIP), puis un test tous les 6 mois. Les items IPIP sont dans
le domaine public, mais en anglais. Traduire et noter nous-mêmes un questionnaire produirait un
instrument non validé, et le brief interdit tout diagnostic et tout chiffre non sourcé.

## Décision

L'app n'intègre pas de questionnaire. L'utilisateur passe un test basé sur l'IPIP ailleurs, puis
saisit la date, le nom du test et ses percentiles (0 à 100) pour les cinq traits. L'écran rappelle
que ce n'est pas un diagnostic.

## Conséquences

- Pas de risque de mauvaise traduction ou de mauvais barème.
- Les scores de tests différents ne sont pas comparables entre eux ; le nom du test est stocké pour
  le signaler.
- Le formulaire de test de suivi (tous les 6 mois) et son rappel restent à faire (V2, rappels).
