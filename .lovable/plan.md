

# Plan : Passer à l'API OTP As A Service d'Ikoddi

## Diagnostic confirmé par la documentation officielle

La documentation Ikoddi confirme deux API distinctes :

```text
SMS Simple (actuel, ne livre pas) :
  POST /groups/{orgId}/sms
  → Retourne un statut générique, SMS non délivré

OTP As A Service (à utiliser) :
  Envoi :  POST /groups/{orgId}/otp/{otpAppId}/sms/{identity}
           → { status: 0, otpToken: "..." }
  Vérif : POST /groups/{orgId}/otp/{otpAppId}/verify
           body: { verificationKey: otpToken, otp: "123456", identity: "2250777992271" }
           → { status: 0, message: "OTP Matched for ..." }
```

Avec l'API OTP, **Ikoddi génère et envoie le code lui-même**. On ne contrôle plus le code OTP — on stocke le `otpToken` retourné et on appelle `/verify` pour valider.

## Modification unique : `supabase/functions/phone-auth/index.ts`

### Supprimer (plus nécessaire)
- `generateOtpCode()` — Ikoddi génère le code
- `hashOtp()` — plus de hash OTP local
- `verifyOtpHash()` — Ikoddi vérifie
- `sendSmsIkoddi()` — remplacée par `sendOtpIkoddi()`

### Conserver (inchangé)
- `hashPin()` / `verifyPin()` — le PIN reste hashé localement
- Toute la logique login, admin-fix-user, rate limits, brute-force protection

### Nouvelles fonctions

**`sendOtpIkoddi(phone)`** :
```text
POST https://api.ikoddi.com/api/v1/groups/10183434/otp/cmmysmq7x1wp54jyk39ri1s3w/sms/{identity}
Headers: x-api-key: ..., Content-Type: application/json
→ { status: 0, otpToken: "UCQS2b..." }
```
Retourne le `otpToken` ou `null` si échec (status !== 0).

**`verifyOtpIkoddi(phone, otp, otpToken)`** :
```text
POST https://api.ikoddi.com/api/v1/groups/10183434/otp/cmmysmq7x1wp54jyk39ri1s3w/verify
Body: { verificationKey: otpToken, otp: "123456", identity: "2250777992271" }
→ { status: 0, message: "OTP Matched" }
```
Retourne `true` si status === 0.

### Impacts par action

| Action | Avant | Après |
|---|---|---|
| `register` | Génère OTP → hash → SMS simple → stocke hash | Appelle `sendOtpIkoddi` → stocke `otpToken` dans `otp_code` |
| `verify-registration` | Compare hash PBKDF2 local | Appelle `verifyOtpIkoddi(phone, otp, storedOtpToken)` |
| `reset-pin-request` | Génère OTP → hash → SMS simple → stocke hash | Appelle `sendOtpIkoddi` → stocke `otpToken` dans `otp_token` |
| `reset-pin-confirm` | Compare hash PBKDF2 local | Appelle `verifyOtpIkoddi(phone, otp, storedOtpToken)` |
| `login` | Aucun changement | Aucun changement |
| `admin-fix-user` | Aucun changement | Aucun changement |

### Réponses au frontend (inchangées)

- Register : `{ success: true, sms_sent: true/false }` — plus de `dev_otp` (Ikoddi gère le code)
- Si `sendOtpIkoddi` échoue : `sms_sent: false`, pas de fallback dev_otp
- Verify : `{ success: true }`
- Login : `{ success: true, session: { access_token, refresh_token, user } }`

### Pas de migration DB nécessaire

Les colonnes `otp_code` (pending_registrations) et `otp_token` (pending_pin_resets) sont de type `text` — elles peuvent stocker le `otpToken` d'Ikoddi directement.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/phone-auth/index.ts` | Remplacer SMS simple par API OTP As A Service |

## Ce qui ne change PAS

- Aucun fichier frontend (web ou mobile)
- Aucune table DB
- Format des réponses JSON identique
- PIN hash PBKDF2 conservé
- Rate limiting et brute-force protection conservés
- Secrets déjà configurés (`IKODDI_API_KEY`, `IKODDI_OTP_APP_ID`, `IKODDI_ORGANIZATION_ID`)

## Après implémentation

Je te fournirai les instructions mises à jour pour Bolt.new, précisant que l'OTP est désormais géré par Ikoddi (pas de `dev_otp` retourné) et que le mobile n'a rien à changer.

