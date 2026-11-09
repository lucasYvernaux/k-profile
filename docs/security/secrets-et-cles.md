# Secrets et clés

| Variable | Rôle | Génération | Si elle fuit | Si elle est perdue |
|---|---|---|---|---|
| `DATA_ENCRYPTION_KEY` | Clé maîtresse qui enveloppe les clés de données | `openssl rand -base64 32` | Toutes les données chiffrées deviennent lisibles avec un accès à la base : re-chiffrer | **Données chiffrées irrécupérables** |
| `BETTER_AUTH_SECRET` | Signature des cookies et chiffrement interne Better Auth | `openssl rand -base64 48` | Falsification de sessions : la changer (déconnecte tout le monde) | Sessions invalidées |
| `DATABASE_URL` | Accès PostgreSQL (ajouter `?sslmode=require` en production) | Fournisseur | Changer le mot de passe | — |
| `VAPID_PRIVATE_KEY` | Signature des notifications push | `npx web-push generate-vapid-keys` | Envoi de push au nom de l'app : régénérer, les abonnements sont à refaire | Abonnements à refaire |
| `CRON_SECRET` | Protège `POST /api/cron/reminders` | `openssl rand -base64 48` | Envoi de rappels non désirés : la changer | — |

Règles :

- Jamais dans Git (`.env*` ignoré, sauf `.env.example` sans valeurs).
- En production, dans le gestionnaire de secrets de l'hébergeur.
- Sauvegarder `DATA_ENCRYPTION_KEY` à part, hors de la base et de ses sauvegardes.
- Le serveur refuse de démarrer si une variable est absente ou mal formée ; le message ne cite que
  les noms des variables, jamais les valeurs.
