# 3. Authentification forte

Date : 2026-11-09

## Statut

Accepté

## Contexte

Le brief exige une authentification forte. L'app n'a pas de service d'envoi d'e-mails, et elle a
un seul utilisateur au départ.

## Décision

- E-mail + mot de passe (12 à 128 caractères), haché par Better Auth (scrypt par défaut).
- **TOTP obligatoire** : tant que `two_factor_enabled` est faux, la couche d'accès aux données
  (`requireUser`, `apiUser`) redirige vers l'activation ou répond 401. Aucune donnée n'est lisible
  sans second facteur. Codes de secours à usage unique fournis à l'activation.
- **Inscription fermée par défaut** (`ALLOW_SIGNUP=false`). On l'ouvre le temps de créer le compte.
- Limitation de débit stockée en base : 5 tentatives par minute sur la connexion et la 2FA,
  3 par minute sur l'inscription, 100 par minute ailleurs.
- Messages d'erreur génériques (« Email ou mot de passe incorrect ») contre l'énumération de comptes.
- Le `proxy` ne fait qu'une redirection optimiste ; l'autorisation est vérifiée au plus près des
  données, dans chaque page, Server Action et Route Handler (guide Next.js « Data Security »).

## Conséquences

- **Pas de réinitialisation du mot de passe par e-mail** (pas d'envoi d'e-mails). Problème connu :
  en cas d'oubli, il faut un accès administrateur à la base. À traiter si l'app s'ouvre à
  d'autres (ajout d'un fournisseur d'e-mails dans l'UE et de `sendResetPassword`).
- Pas de vérification de l'adresse e-mail pour la même raison.
- Les passkeys (WebAuthn, plugin `@better-auth/passkey`) sont une amélioration possible ; non
  activées dans le MVP.
