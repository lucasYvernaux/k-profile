# Dépannage Cloudflare Workers

## « This socket has been closed » (pg dans workerd)

**Symptôme** : `unhandledRejection: TypeError: This socket has been closed`, puis une Server Action
qui échoue.
**Cause** : un `Pool` node-postgres avec `maxUses: 1` ferme ses clients pendant que le driver
Cloudflare lit encore la socket.
**Solution** : un seul `Client` par requête (`src/server/db/client.ts`), comme dans les exemples
Hyperdrive de Cloudflare.

## « The argument 'inputEncoding' … must be a Buffer »

**Cause** : dans workerd, `cipher.update(chaine)` sans encodage n'est pas accepté.
**Solution** : convertir explicitement en `Buffer.from(texte, "utf8")` (`src/server/crypto/cipher.ts`).

## Le build Next.js échoue sur `playwright.config.ts`

`next build` vérifie les types de tout le projet. Une erreur de type dans un fichier de
configuration de test fait échouer `opennextjs-cloudflare build`.

## `proxy.ts` ignoré ou refusé

Le `proxy` de Next.js 16 tourne en Node.js, non pris en charge par OpenNext. Garder
`src/middleware.ts` (Edge). L'avertissement de dépréciation au build est attendu (ADR 0008).

## Erreur 1102 « Worker exceeded resource limits »

Limite CPU dépassée. Vérifier que le compte est sur le plan Workers Paid (10 ms par requête sur le
plan gratuit). Voir **Metrics** du Worker (`exceededCpu`).

## Build Workers Builds : nom de Worker différent

Le `name` de `wrangler.jsonc` (`k-profile`) doit correspondre au nom du Worker dans le tableau de
bord.

## `wrangler dev` : « Unable to fetch the Request.cf object »

Avertissement sans conséquence quand la machine ne peut pas joindre l'API Cloudflare (réseau
restreint) : un objet `cf` par défaut est utilisé.
