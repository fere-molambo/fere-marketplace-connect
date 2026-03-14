

# Intégrer Africa's Talking SMS dans phone-auth

## Situation
- Compte AT production : app "Fere", username "Junior_Mamete"
- Solde : 44.24 XOF (~3-4 SMS de test possibles)
- API key obtenue
- Fallback dev_otp conservé si le solde tombe à zéro

## Changements

### 1. Ajouter 2 secrets au projet
- `AFRICASTALKING_API_KEY` — ta clé API production
- `AFRICASTALKING_USERNAME` — `Junior_Mamete`

### 2. Edge Function `phone-auth/index.ts`

**Supprimer** la logique Orange SMS :
- Constantes `ORANGE_API_BASE`, `SMS_SENDER_ADDRESS`, `cachedToken` (lignes 9-10, 17)
- Fonctions `getAccessToken()`, `checkSmsBalance()`, `sendSms()` (plus bas dans le fichier)

**Ajouter** une fonction `sendSmsAfricasTalking()` :
```text
POST https://api.africastalking.com/version1/messaging
Headers:
  apiKey: ${AFRICASTALKING_API_KEY}
  Content-Type: application/x-www-form-urlencoded
  Accept: application/json
Body:
  username=Junior_Mamete&to=${phone}&message=${text}
```

**Modifier `handleRegister`** (lignes 167-194) :
- Supprimer le check de balance Orange
- Appeler `sendSmsAfricasTalking()` directement
- Garder le fallback `dev_otp` si l'envoi échoue (solde épuisé, erreur réseau, etc.)

### 3. Frontend
Aucun changement — gère déjà `sms_sent` et `dev_otp`.

## Résumé
- 1 fichier modifié : `supabase/functions/phone-auth/index.ts`
- 2 secrets à ajouter
- ~3-4 SMS de test possibles avec le solde actuel
- Fallback automatique en mode dev_otp quand le solde sera épuisé

