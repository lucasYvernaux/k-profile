# OWASP Top 10:2025, correspondance avec K

Source : OWASP Top 10:2025, https://owasp.org/Top10/2025/ (liste vérifiée le 2026-11-09).

| Catégorie | Mesures en place | Reste à faire |
|---|---|---|
| A01:2025 Broken Access Control | Chaque requête de données filtre sur `user_id` issu de la session (`src/server/data/*`). Autorisation vérifiée dans chaque page, Server Action et Route Handler, pas seulement dans le proxy. Identifiants validés (UUID) avant usage. Test e2e : pages protégées redirigées. | Tests d'accès croisé à deux comptes quand l'inscription s'ouvrira. |
| A02:2025 Security Misconfiguration | CSP stricte à nonce, HSTS, `nosniff`, `X-Frame-Options: DENY`, Permissions-Policy, COOP/CORP, `poweredByHeader: false`, `Cache-Control: no-store` sur `/api`. Variables d'environnement validées au démarrage. `robots: noindex`. | Vérifier les en-têtes sur l'hébergement réel. |
| A03:2025 Software Supply Chain Failures | `pnpm-lock.yaml` versionné, scripts d'installation bloqués par pnpm (`ignoredBuiltDependencies`), dépendances peu nombreuses, `uqr` sans dépendance pour le QR code. | Activer Dependabot ou Renovate et `pnpm audit` en CI. |
| A04:2025 Cryptographic Failures | AES-256-GCM avec IV aléatoire de 96 bits, clé par utilisateur enveloppée par une clé maîtresse, données associées (ADR 0002). HTTPS imposé par HSTS. Mots de passe hachés (scrypt, Better Auth). | Script de rotation de la clé maîtresse. |
| A05:2025 Injection | Requêtes paramétrées (Drizzle), validation Zod de toutes les entrées, rendu React échappé, QR code dessiné en SVG sans `innerHTML`, export CSV protégé contre l'injection de formules. | — |
| A06:2025 Insecure Design | Minimisation (prénoms seulement pour le cercle des 5, notifications push au texte générique), service worker qui ne met pas en cache le journal, aucun conseil fiscal ni diagnostic. | Analyse de risques RGPD (AIPD) avant ouverture à d'autres utilisateurs. |
| A07:2025 Authentication Failures | TOTP obligatoire, codes de secours, mot de passe ≥ 12 caractères, limitation de débit, messages génériques, cookies `HttpOnly` et `SameSite=Lax`, `Secure` en production, sessions de 7 jours. | Pas de réinitialisation de mot de passe (ADR 0003). Passkeys possibles. |
| A08:2025 Software or Data Integrity Failures | Tag GCM vérifié à chaque déchiffrement, vérification d'origine sur les API JSON (anti-CSRF), secret comparé en temps constant sur l'endpoint cron. | — |
| A09:2025 Security Logging and Alerting Failures | Better Auth journalise les échecs de mot de passe. | Journal d'audit des connexions et alertes : non fait. Ne jamais journaliser de contenu du journal. |
| A10:2025 Mishandling of Exceptional Conditions | Erreurs de déchiffrement normalisées (`DecryptionError`), réponses JSON génériques, file hors ligne qui abandonne les éléments invalides (400) au lieu de boucler. | Pages `error.tsx` personnalisées. |

## Modules repris de NYX-KAIROS (ADR 0010)

| Risque | Mesure |
|---|---|
| A01 Contrôle d'accès | `route()` exige un utilisateur avec TOTP ; chaque requête filtre sur `currentUserId()` ; clés étrangères `(user_id, id)` : une ligne ne peut pas référencer les données d'un autre compte. Tests e2e : lecture, modification, suppression et ajout de contact refusés depuis un autre compte. |
| A01 CSRF | Vérification `Origin` / `Sec-Fetch-Site` sur toute requête qui modifie (`src/server/http/origin.ts`). |
| A04 Défaillances cryptographiques | Colonnes `sealed()` (AES-256-GCM, clé par utilisateur, données associées colonne + utilisateur) ; accès hors contexte utilisateur refusé. |
| A05 Injection | Requêtes Drizzle paramétrées ; entrées validées par zod (clés inconnues retirées, tailles bornées, corps JSON ≤ 64 Kio par défaut). |
| A06 Conception | Import de sauvegarde NYX (effaçait toutes les tables) non repris ; migration par script unique, base source en lecture seule. |
| A09/A10 Journalisation et erreurs | Erreurs inattendues : réponse générique 500 ; `describeError` ne journalise jamais les paramètres SQL. |
