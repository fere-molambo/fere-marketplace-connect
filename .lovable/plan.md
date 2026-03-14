
# Phase 1 — Inscription et Connexion Phone + PIN (compatible mobile)

## Statut : ✅ IMPLÉMENTÉ

### Ce qui a été fait :

1. **Migration SQL** — 5 tables créées :
   - `pending_registrations` (inscriptions en attente OTP)
   - `user_pins` (PIN hashé + mot de passe interne)
   - `login_attempts` (protection brute-force)
   - `otp_rate_limits` (max 3 OTP/heure)
   - `pin_reset_requests` (préparé pour Phase 2)
   - Fonction `cleanup_expired_registrations()`
   - RLS activé sur toutes les tables, accès via service_role uniquement

2. **Edge Function `phone-auth`** — 3 actions :
   - `register` : validation, hash PIN, OTP, SMS Orange
   - `verify-registration` : validation OTP, création user Supabase Auth
   - `login` : vérification PIN, session Supabase via mot de passe interne

3. **Frontend** :
   - `PhoneLoginForm` : téléphone + PIN 6 chiffres (InputOTP)
   - `PhoneSignupForm` : nom, téléphone, email optionnel, rôle, PIN + étape OTP
   - `OtpVerificationStep` : saisie OTP avec timer 5 min et renvoi
   - `Auth.tsx` : mode phone (défaut) + bascule vers email (admin)
   - Validators : `phoneLoginSchema`, `phoneSignupSchema`
   - `useAuth` : ajout `signInWithPin()`

### Compatibilité mobile :
Le mobile appelle directement `supabase.functions.invoke('phone-auth', { body: { action, ... } })`.

### Phase 2 (à venir) :
- Reset PIN (forgot-pin)
- UI admin pour pin_reset_requests
- Cron cleanup_expired_registrations
