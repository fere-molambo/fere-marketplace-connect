# Migration OTP : Ikoddi/Twilio → Orange Mali SMS API

## Objectif
Remplacer l'envoi d'OTP via Ikoddi (et toute référence Twilio) par l'API SMS Orange Mali. Aucun changement fonctionnel côté utilisateur ni côté UI. Pas d'impact sur Orange Money Webpay.

## Numéro expéditeur confirmé
`tel:+22376771321` (Mali) — utilisé comme `senderAddress` dans l'URL outbound Orange.

---

## 1. Secrets à configurer

### À ajouter (via `add_secret`)
- `ORANGE_SMS_CLIENT_ID` = `obdWUyZUcSIEHGEUDJiL099rzNAVgYwi`
- `ORANGE_SMS_CLIENT_SECRET` = `0cjT9VJpzgcsgrA8XzNuGaFo6ZGJiQVWcQzOYN0EPtov`
- `ORANGE_SMS_AUTH_HEADER` = `Basic ...` (header complet fourni par le user)
- `ORANGE_SMS_SENDER_ADDRESS` = `tel:+22376771321`

### À supprimer (via `delete_secret`)
- `IKODDI_API_KEY`
- `IKODDI_OTP_APP_ID`
- `IKODDI_ORGANIZATION_ID`
- `TWILIO_API_KEY`
- `AFRICASTALKING_USERNAME`
- `AFRICASTALKING_API_KEY`

Conserver tous les `ORANGE_MONEY_*` (Webpay) intacts.

---

## 2. Fichier modifié : `supabase/functions/phone-auth/index.ts`

Seul fichier touché. Aucun autre code (UI, DB, autres edge functions) n'est modifié.

### Changements internes
- Suppression complète des fonctions `sendOtpIkoddi()` et `verifyOtpIkoddi()`.
- Ajout :
  - `getOrangeAccessToken()` : POST `https://api.orange.com/oauth/v1/token` avec `ORANGE_SMS_AUTH_HEADER`, cache token en mémoire (TTL ~ expires_in - 60s).
  - `sendOtpOrange(phone, code)` : POST `https://api.orange.com/smsmessaging/v1/outbound/{senderAddress}/requests` avec retry sur 401 (refresh token).
  - `verifyOtpLocal(phone, code)` : compare hash SHA-256 stocké dans `pending_registrations.otp_code` (comparaison constant-time).
- Génération OTP locale : 6 chiffres, expiration 10 minutes (inchangé).
- Format message : `Fere : votre code de vérification est {CODE}. Valide 10 minutes. Ne le partagez avec personne.`

### Endpoints (signatures inchangées)
- `register` → envoie OTP via Orange
- `verify-registration` → vérifie OTP localement
- `reset-pin-request` → envoie OTP via Orange
- `reset-pin-confirm` → vérifie OTP localement
- `login`, `request-admin-reset`, `admin-fix-user` → aucun changement

### Gestion d'erreurs
- 401 token expiré → refresh + 1 retry
- 403 / quota → erreur claire renvoyée, `sms_sent: false`
- Autres 4xx/5xx → log + `sms_sent: false`, l'utilisateur voit toast d'erreur générique

---

## 3. Aucune migration DB
La table `pending_registrations` continue de stocker le hash OTP dans `otp_code` et `otp_expires_at`. Aucune colonne à ajouter/supprimer.

---

## 4. Mobile (Bolt.new) — message à transmettre

> Côté mobile, **aucun changement de code**. Les actions, payloads et réponses de la fonction `phone-auth` restent strictement identiques (`register`, `verify-registration`, `reset-pin-request`, `reset-pin-confirm`, `login`).
>
> Seule différence visible : le SMS OTP est désormais envoyé depuis le numéro **+223 76 77 13 21 (Orange Mali)** au lieu d'Ikoddi.
>
> L'intégration **Orange Money Webpay live** précédente n'est **pas affectée** : elle utilise des secrets séparés (`ORANGE_MONEY_*`) et un endpoint distinct (`orange-money-payment`).

---

## 5. Validation après déploiement
1. Test inscription avec un numéro `+223...` réel → SMS reçu sous 30s.
2. Test reset PIN → SMS reçu, nouveau PIN accepté.
3. Logs edge function `phone-auth` : pas d'erreur 401/403 Orange.
4. Login PIN inchangé.
5. Test paiement Orange Money Webpay → toujours fonctionnel (régression).

---

## Question avant exécution
Confirmes-tu que je peux :
1. **Supprimer** les secrets Ikoddi, Twilio, Africastalking listés ci-dessus ?
2. **Ajouter** les 4 nouveaux secrets `ORANGE_SMS_*` ?