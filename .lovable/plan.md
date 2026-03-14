

# Intégration Ikoddi OTP pour remplacer Africa's Talking

## Contexte
Africa's Talking renvoie 401 malgré la bonne clé. Ikoddi est un provider SMS spécialisé Afrique de l'Ouest avec un endpoint OTP dédié (`/v1/otp/send` et `/v1/otp/verify`).

## Approche : Utiliser l'API OTP dédiée d'Ikoddi

Ikoddi propose deux options :
1. **API OTP managée** — Ikoddi génère, envoie et vérifie le code lui-même
2. **API SMS classique** — On envoie un SMS avec notre propre code OTP

**Option recommandée : API OTP managée** — Plus simple, Ikoddi gère la génération/vérification du code.

## Secrets requis

Deux nouveaux secrets à configurer :
- `IKODDI_API_KEY` — Clé API depuis le dashboard Ikoddi
- `IKODDI_OTP_APP_ID` — ID de l'app OTP créée dans Ikoddi

## Changements

### 1. Edge Function `phone-auth/index.ts`

- **Supprimer** `sendSmsAfricasTalking()` entièrement
- **Ajouter** deux fonctions Ikoddi :
  - `sendOtpIkoddi(phone)` — appelle `POST https://api.ikoddi.com/v1/otp/send` avec `to`, `length: 6`, `expiry: 300`
  - `verifyOtpIkoddi(phone, otp)` — appelle `POST https://api.ikoddi.com/v1/otp/verify`
- **Modifier `handleRegister()`** :
  - Remplacer la génération locale d'OTP par l'appel à `sendOtpIkoddi(phone)`
  - Ne plus stocker `otp_code` dans `pending_registrations` (Ikoddi le gère)
- **Modifier `handleVerifyRegistration()`** :
  - Remplacer la comparaison locale `pending.otp_code !== otp` par `verifyOtpIkoddi(phone, otp)`
  - Garder la logique de création de compte identique
- **Conserver** le fallback dev_otp si Ikoddi échoue (mode test)
- **Supprimer** le log diagnostic AT temporaire

### 2. Renvoi OTP (resend)

Quand l'utilisateur clique "Renvoyer le code" :
- Appeler à nouveau `sendOtpIkoddi(phone)` — Ikoddi invalide l'ancien code automatiquement

### 3. Frontend — Aucun changement

Le frontend (`PhoneSignupForm`, `OtpVerificationStep`, `PhoneLoginForm`) reste identique. Seul le backend change de provider.

### 4. Nettoyage

- Retirer les secrets `AFRICASTALKING_API_KEY` et `AFRICASTALKING_USERNAME` (optionnel, peuvent rester inactifs)

## Prérequis utilisateur

Avant l'implémentation :
1. Créer un compte sur [ikoddi.com](https://ikoddi.com)
2. Créer une "App OTP" dans le dashboard Ikoddi
3. Récupérer la **clé API** et l'**OTP App ID**

