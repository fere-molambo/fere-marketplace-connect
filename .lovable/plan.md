

# Correction de l'intégration Ikoddi OTP

## Problèmes identifiés (CRITIQUES)

D'après la documentation officielle, **tout est incorrect** dans l'implémentation actuelle :

| Élément | Actuel (FAUX) | Correct (doc Ikoddi) |
|---------|---------------|----------------------|
| URL Send | `https://api.ikoddi.com/v1/otp/send` | `https://api.ikoddi.com/api/v1/groups/{org_id}/otp/{otp_app_id}/sms/{identity}` |
| URL Verify | `https://api.ikoddi.com/v1/otp/verify` | `https://api.ikoddi.com/api/v1/groups/{org_id}/otp/{otp_app_id}/verify` |
| Auth header | `Authorization: Bearer {key}` | `x-api-key: {key}` |
| Send body | `{ to, length, expiry, app_id, message }` | Pas de body — phone dans l'URL |
| Send response | Ignorée | Retourne `{ status: 0, otpToken: "..." }` — **le token doit être stocké** |
| Verify body | `{ to, code, app_id }` | `{ verificationKey: otpToken, otp: code, identity: phone }` |
| Secret manquant | — | `IKODDI_ORGANIZATION_ID` requis |
| Format téléphone | `+22370000000` | `22370000000` (sans le `+`) |

## Flux correct selon la doc

1. **Send OTP** : `POST /api/v1/groups/{org_id}/otp/{otp_app_id}/sms/{phone_sans_plus}`
   - Header : `x-api-key: {IKODDI_API_KEY}`
   - Réponse : `{ status: 0, otpToken: "UCQS2b..." }`
   - **Il faut stocker `otpToken`** pour la vérification

2. **Verify OTP** : `POST /api/v1/groups/{org_id}/otp/{otp_app_id}/verify`
   - Header : `x-api-key: {IKODDI_API_KEY}`
   - Body : `{ verificationKey: otpToken, otp: "629185", identity: "22670707070" }`
   - Réponse succès : `{ status: 0, message: "OTP Matched for ..." }`

## Changements requis

### 1. Nouveau secret : `IKODDI_ORGANIZATION_ID`
- À récupérer sur https://app.ikoddi.com/team/details

### 2. Edge Function `phone-auth/index.ts`

**`sendOtpIkoddi(phone)`** :
- URL : `https://api.ikoddi.com/api/v1/groups/${orgId}/otp/${otpAppId}/sms/${phone.replace('+','')}`
- Header : `x-api-key: ${apiKey}`
- Retourner le `otpToken` de la réponse

**`verifyOtpIkoddi(phone, code, otpToken)`** :
- URL : `https://api.ikoddi.com/api/v1/groups/${orgId}/otp/${otpAppId}/verify`
- Body : `{ verificationKey: otpToken, otp: code, identity: phone.replace('+','') }`

**`handleRegister`** :
- Stocker `otpToken` dans `pending_registrations.otp_code` (réutiliser la colonne existante au lieu du placeholder `000000`)

**`handleVerifyRegistration`** :
- Passer `pending.otp_code` comme `verificationKey` à `verifyOtpIkoddi`

### 3. Frontend — Aucun changement

