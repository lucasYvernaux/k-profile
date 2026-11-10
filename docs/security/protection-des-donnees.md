# Protection des données (RGPD)

## Données traitées

| Donnée | Catégorie | Stockage |
|---|---|---|
| Journal émotionnel (émotions, contexte) | Santé (art. 9 RGPD) | Chiffré (ADR 0002) |
| Sommeil, verres d'alcool, mesures physiques, Big Five | Santé | Chiffré |
| Priorités du jour, revues, audit business et argent | Personnel | Chiffré |
| Abonnement push (clés) | Technique | Clés chiffrées, endpoint en clair |
| Titres et statuts des habitudes, cases cochées, jalons, journée type | Personnel | En clair (requêtes) |
| E-mail, nom, sessions (IP, user-agent) | Identification | En clair (Better Auth) |
| Modules repris de NYX-KAIROS (ADR 0010) : mensurations, séances, consommations (alcool), bilan du jour, émotions détaillées, revues hebdo et mensuelles, objectifs et projets, réglages | Santé et personnel | Chiffré (colonnes `sealed()`), dates et types en clair |
| Réseau : nom, surnom, dates (naissance, décès, contacts), moyens de contact, liens de parenté, « en froid » et raison, notes, historique des contacts | **Données sur des tiers** (personnes qui ne sont pas utilisatrices) | Chiffré ; seuls le niveau de proximité, « moi » et « décédé » sont en clair |
| Routine, entretien, citations, compétences, centres d'intérêt, score et badges | Personnel | En clair (requêtes) |

## Droits

- **Accès et portabilité** : Réglages → export JSON complet ou CSV.
- **Effacement** : Réglages → suppression du compte, avec mot de passe et confirmation. Suppression en
  cascade de toutes les tables et de la clé de chiffrement de l'utilisateur.

### Données sur des tiers (module Réseau)

Tant que l'app sert à une seule personne pour un usage personnel, l'exemption domestique du RGPD
(art. 2.2.c) devrait s'appliquer ; **je ne sais pas** si elle couvre toutes les données saisies (à
faire confirmer). Avant d'ouvrir l'app à d'autres personnes : informer les utilisateurs qu'ils
doivent avoir un motif légitime, prévoir le traitement des demandes des personnes concernées, et
faire l'analyse d'impact (AIPD). Le détail établi pour NYX-KAIROS reste valable
(`nyx-kairos-command-cente/docs/security/privacy-and-legal-status.md`).

## Hébergement

L'app est prévue pour Cloudflare Workers (ADR 0008), avec une base PostgreSQL dans l'UE derrière
Hyperdrive. Les données sont stockées chiffrées dans la base, mais **déchiffrées en mémoire dans le
Worker**, sur le réseau Cloudflare (entreprise américaine). À vérifier avant la mise en production :
l'accord de traitement des données (DPA) de Cloudflare et l'encadrement des transferts hors UE.

Le brief exige un hébergement dans l'UE. **Le fournisseur de base de données n'est pas encore
choisi.** Critères :
région UE, PostgreSQL managé avec chiffrement disque et sauvegardes chiffrées, TLS vers la base,
gestionnaire de secrets.

**Je ne sais pas** si la certification HDS (hébergeur de données de santé) s'applique à cette app :
elle vise l'hébergement de données de santé pour le compte d'un tiers. Pour une app strictement
personnelle, cela semble ne pas être le cas, mais il faut le faire vérifier (juriste ou DPO) avant
d'ouvrir l'app à d'autres personnes.

## Données sur l'appareil

- Une entrée saisie hors ligne reste en clair dans IndexedDB jusqu'à sa synchronisation (ADR 0006).
- La page « Aujourd'hui » est mise en cache par le service worker.
- Les deux sont effacées à la déconnexion. Garder l'appareil verrouillé.
- Alertes locales des modules repris : préférences `nyx_notifs`, `nyx_dnd` et marqueurs de rappel
  dans le `localStorage` (aucune donnée personnelle), choisis par l'utilisateur dans Réglages.
