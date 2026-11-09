# 2. Chiffrement applicatif des données sensibles

Date : 2026-11-09

## Statut

Accepté

## Contexte

Le journal émotionnel, l'audit (mesures physiques, alcool, Big Five), les priorités du jour, le
sommeil et les revues sont des données personnelles, dont une partie relève des données de santé
(article 9 du RGPD). Le brief exige un chiffrement au repos et en transit. Le chiffrement disque
du fournisseur de base de données protège contre le vol de disque, mais pas contre une fuite de
sauvegarde ou un accès SQL indu.

## Décision

- Chiffrement **applicatif** AES-256-GCM (module `node:crypto`), dans `src/server/crypto/`.
- **Chiffrement par enveloppe** : chaque utilisateur a une clé de données aléatoire de 256 bits,
  stockée chiffrée (« enveloppée ») par la clé maîtresse `DATA_ENCRYPTION_KEY` dans `user_key`.
- Chaque valeur chiffrée porte une **donnée associée** `<colonne>:<user_id>` : un chiffré copié vers
  une autre ligne ou un autre utilisateur échoue au déchiffrement.
- Format versionné `v1.<iv>.<tag>.<chiffré>` pour permettre une rotation d'algorithme.
- Restent en clair uniquement les colonnes nécessaires aux requêtes : identifiants, dates, statut
  et titre des habitudes, jalons de la feuille de route, journée type, seuils micro.
- Suppression du compte : la clé enveloppée est supprimée en cascade, ce qui rend illisibles les
  chiffrés qui subsisteraient dans des sauvegardes (« crypto-shredding »).

## Conséquences

- Pas de recherche SQL possible dans le contenu chiffré ; les agrégats (nuage d'émotions, moyenne
  de sommeil) sont calculés en mémoire, ce qui reste léger pour un utilisateur.
- **Perdre `DATA_ENCRYPTION_KEY` rend toutes les données illisibles.** Elle doit être sauvegardée
  hors de la base (gestionnaire de secrets), voir `docs/security/secrets-et-cles.md`.
- La rotation de la clé maîtresse demande de ré-envelopper les clés utilisateurs (colonne
  `master_key_version` prévue, script de rotation non écrit).
- Le chiffrement en transit relève de l'hébergement : HTTPS (HSTS envoyé) et `sslmode=require`
  vers PostgreSQL.
