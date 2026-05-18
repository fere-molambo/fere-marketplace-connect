## Correction config Orange SMS + logging détaillé pour debug

### Pourquoi corriger

La doc Orange officielle (section 3.1) impose `senderAddress = tel:+{country_sender_number}` avec la table par pays. Pour le Mali (MLI) : **`tel:+2230000`**. Le `SMS 928248` visible dans le portail est un *sender name par défaut* appliqué automatiquement côté Orange, pas une adresse API.

Zone d'incertitude assumée : Orange Mali Business peut avoir des spécificités locales (sender perso pré-whitelisté, format différent). D'où le logging exhaustif ci-dessous pour diagnostiquer rapidement si le premier essai échoue.

### 1. Mise à jour du secret

- `ORANGE_SMS_SENDER_ADDRESS` : actuel `tel:+22376771321` → **`tel:+2230000`**

### 2. Refonte de `supabase/functions/phone-auth/index.ts` — partie envoi SMS

**Endpoints :**
- Token : `https://api.orange.com/oauth/v3/token` (v3, pas v1)
- Outbound : `https://api.orange.com/smsmessaging/v1/outbound/{senderAddress URL-encoded}/requests`
- Body : **sans `senderName`** (le défaut Orange s'applique automatiquement)

**Logging détaillé à ajouter** (avec un prefixe stable `[OrangeSMS]` pour filtrer dans les logs) :

À chaque étape, logger :

1. **Avant token request** :
   - `[OrangeSMS] Token request → URL, présence/longueur de AUTH_HEADER (jamais la valeur), cache hit/miss`
2. **Réponse token** :
   - `[OrangeSMS] Token response → status, expires_in, token_type, (préfixe access_token : 8 premiers chars uniquement)`
   - Si erreur : body brut complet (les erreurs OAuth ne contiennent pas de secret exploitable)
3. **Avant outbound** :
   - `[OrangeSMS] Outbound request → sender_address (valeur), sender_address_encoded (URL-encodée), recipient (masqué : 4 derniers chiffres), endpoint final, message_length, body JSON complet (le code OTP est éphémère, c'est OK le temps du debug)`
4. **Réponse outbound** :
   - `[OrangeSMS] Outbound response → status, content-type, body brut`
   - Sur 201/200 : `resourceURL`, `resource_id` extrait
   - Sur 4xx/5xx : body JSON brut + headers de réponse pertinents (`x-request-id`, `www-authenticate` si 401)
5. **Sur retry après 401** :
   - `[OrangeSMS] 401 → token expired, forcing refresh, retrying outbound`
6. **Sur exception réseau** :
   - `[OrangeSMS] Network error → error.name, error.message, stack`

**Contract de réponse au client** : en cas d'échec SMS, renvoyer un payload structuré au mobile :
```json
{
  "success": false,
  "stage": "sms_send" | "token" | "validation",
  "orange_status": 400,
  "orange_code": "...",
  "orange_message": "...",
  "request_id": "..." 
}
```
Sans exposer les secrets, mais assez pour que l'utilisateur puisse copier l'erreur dans le chat et qu'on diagnostique en 1 aller-retour.

### 3. Stratégie de fallback si `tel:+2230000` ne fonctionne pas

Le code prévoira **un seul comportement** (la valeur du secret), mais on documente une matrice de tests rapides par changement de secret (aucun redeploy nécessaire) :

| Test | Valeur secret `ORANGE_SMS_SENDER_ADDRESS` | Si échec, indice |
|---|---|---|
| A (officiel doc) | `tel:+2230000` | Si `400 invalid sender` → essayer B |
| B (short code +) | `tel:+928248` | Si `400` → essayer C |
| C (short code nu) | `tel:928248` | Si `400` → essayer D |
| D (numéro complet) | `tel:+22376771321` | Si `400` → contacter support Orange Mali |

Le logging à l'étape 4 ci-dessus permettra d'identifier immédiatement laquelle des valeurs Orange accepte.

### 4. Mise à jour de `.lovable/plan.md`

Refléter : sender `tel:+2230000`, OAuth v3, sender name par défaut géré côté Orange, logging `[OrangeSMS]` activé.

### 5. Validation

1. Déployer `phone-auth`.
2. Tester avec un vrai numéro `+223...` depuis le mobile ou via `curl_edge_functions`.
3. Lire les logs `phone-auth` filtrés sur `[OrangeSMS]`.
4. Si succès : SMS reçu, expéditeur `SMS 928248` (ou nom par défaut Orange Mali) — terminé.
5. Si `400` au niveau outbound : copier le body de réponse Orange, appliquer la matrice de la section 3.

### 6. Impact mobile

**Aucun** côté Bolt. La structure de réponse enrichie (`stage`, `orange_status`, etc.) est **additive** — les champs `success` et `error` existants restent en place et le mobile peut ignorer les nouveaux champs.

### Section technique

- `encodeURIComponent("tel:+2230000")` → `tel%3A%2B2230000` (à utiliser dans le path de l'URL outbound).
- Le `Authorization` header pour `/oauth/v3/token` reste `Basic <base64(client_id:client_secret)>` → conserver le secret `ORANGE_SMS_AUTH_HEADER` (valeur incluant le `Basic ` prefix).
- Le token OAuth v3 est typiquement valide ~1h ; garder le cache mémoire avec TTL = `expires_in - 60s`.
- TPS limité à 5 SMS/seconde → non bloquant pour des OTP individuels.
- Le logging du body OTP est volontaire pendant la phase de validation. Une fois le canal stabilisé, on retirera la ligne du body et on gardera juste les métadonnées.
