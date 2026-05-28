## Correction OAuth Orange Money — inverser priorité du header

### Problème
La fonction `orange-money-payment` reconstruit actuellement le header `Basic` à partir de `ORANGE_MONEY_CLIENT_ID:ORANGE_MONEY_CLIENT_SECRET` (priorité) et reçoit `Wrong password for client` d'Orange, même après mise à jour des secrets. Le `Authorization header` fourni directement par le portail Orange (`Basic b2JkV1V5...`) est garanti correct.

### Changement
Dans `supabase/functions/orange-money-payment/index.ts` (fonction `getAccessToken`, lignes ~90-115) :

1. **Priorité 1** : utiliser `ORANGE_MONEY_AUTH_HEADER` tel quel s'il est défini (préfixer `Basic ` si absent, trim).
2. **Fallback** : reconstruire `Basic ` + `btoa(client_id:client_secret)` uniquement si `AUTH_HEADER` absent.
3. Conserver le log `auth_source` pour confirmer la source utilisée.

### Test après déploiement
- Appel `get_token` → doit retourner `success: true`
- Si échec persistant avec `auth_source: env_auth_header` → cliquer **Renew** sur le portail Orange et recopier les 3 valeurs (Client secret + Authorization header).

### Portée
- 1 fichier modifié : `supabase/functions/orange-money-payment/index.ts`
- Aucun changement DB, frontend, ou autres edge functions
- Déploiement automatique