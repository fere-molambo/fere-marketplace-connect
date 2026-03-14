

# Ajout des boutons "PIN oublié" et "Demande PIN admin" sur le formulaire de connexion téléphone

## Constat

Le `PhoneLoginForm` ne contient actuellement que le champ téléphone, le champ PIN et le bouton "Se connecter". Il manque deux actions essentielles :
1. **Code PIN oublié** — permet à l'utilisateur de réinitialiser son PIN via OTP SMS (Ikoddi)
2. **Demande PIN admin** — permet à l'utilisateur de soumettre une demande de réinitialisation par un administrateur

## Changements prévus

### 1. Edge Function `phone-auth/index.ts` — Nouvelle action `reset-pin`

Ajouter un flux de réinitialisation de PIN en 2 étapes :
- **`reset-pin-request`** : vérifie que le téléphone existe dans `profiles`, envoie un OTP via Ikoddi, stocke le `otpToken` dans une nouvelle entrée temporaire (table `pending_pin_resets`)
- **`reset-pin-confirm`** : vérifie l'OTP via Ikoddi, puis accepte un nouveau PIN, le hash avec PBKDF2 et met à jour `user_pins`

### 2. Edge Function `phone-auth/index.ts` — Nouvelle action `request-admin-reset`

- Insère une demande dans une table `pin_reset_requests` (user_id, phone, status: "pending", created_at)
- Un admin pourra voir ces demandes dans le dashboard et réinitialiser le PIN manuellement

### 3. Base de données — 2 nouvelles tables

- **`pending_pin_resets`** : phone, otp_token, otp_expires_at, otp_attempts, new_pin_hash, created_at
- **`pin_reset_requests`** : id, phone, user_id, status (pending/approved/rejected), created_at, resolved_at, resolved_by

### 4. Frontend — `PhoneLoginForm.tsx`

Ajouter sous le bouton "Se connecter" deux liens :
- "PIN oublié ?" → ouvre un flux inline (saisie téléphone → OTP → nouveau PIN)
- "Demander à un admin" → envoie la demande et affiche une confirmation

### 5. Frontend — Nouveau composant `ResetPinFlow.tsx`

Composant en 3 étapes :
1. Saisie du numéro de téléphone → appel `reset-pin-request`
2. Saisie du code OTP reçu par SMS
3. Saisie du nouveau PIN (6 chiffres + confirmation) → appel `reset-pin-confirm`

### 6. Dashboard admin — Section demandes de réinitialisation (optionnel, phase 2)

Visible dans la page Users ou Settings pour les admins, listant les `pin_reset_requests` en attente.

## Résumé des fichiers modifiés

| Fichier | Action |
|---------|--------|
| `supabase/functions/phone-auth/index.ts` | Ajouter actions `reset-pin-request`, `reset-pin-confirm`, `request-admin-reset` |
| Migration SQL | Créer tables `pending_pin_resets` et `pin_reset_requests` avec RLS |
| `src/components/auth/PhoneLoginForm.tsx` | Ajouter les 2 boutons + état pour le flux reset |
| `src/components/auth/ResetPinFlow.tsx` | Nouveau composant 3 étapes |
| `src/components/auth/RequestAdminResetDialog.tsx` | Dialog de demande admin |

