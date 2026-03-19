
# Phase 1 — Inscription et Connexion Phone + PIN (compatible mobile)

## Statut : ✅ IMPLÉMENTÉ

### Ce qui a été fait :

1. **Migration SQL** — 5 tables créées :
   - `pending_registrations` (inscriptions en attente OTP)
   - `user_pins` (PIN hashé + mot de passe interne)
   - `login_attempts` (protection brute-force)
   - `otp_rate_limits` (max 10 OTP/heure)
   - `pin_reset_requests` (préparé pour Phase 2)
   - Fonction `cleanup_expired_registrations()`
   - RLS activé sur toutes les tables, accès via service_role uniquement

2. **Edge Function `phone-auth`** — 6 actions :
   - `register` : validation, hash PIN, génération OTP locale, envoi SMS simple via Ikoddi
   - `verify-registration` : vérification OTP locale (hash PBKDF2), création user Supabase Auth
   - `login` : vérification PIN, session Supabase via mot de passe interne
   - `reset-pin-request` : OTP par SMS pour réinitialisation PIN
   - `reset-pin-confirm` : vérification OTP + nouveau PIN
   - `request-admin-reset` : demande manuelle à un admin

3. **Frontend** :
   - `PhoneLoginForm` : téléphone + PIN 6 chiffres (InputOTP)
   - `PhoneSignupForm` : nom, téléphone, email optionnel, rôle, PIN + étape OTP
   - `OtpVerificationStep` : saisie OTP avec timer 5 min et renvoi
   - `Auth.tsx` : mode phone (défaut) + bascule vers email (admin)
   - Validators : `phoneLoginSchema`, `phoneSignupSchema`
   - `useAuth` : ajout `signInWithPin()`

### Changement OTP (v2) — Mars 2026 :
- **Avant** : API OTP managée d'Ikoddi (Ikoddi génère + vérifie le code) → problème d'expiration trop courte côté Ikoddi
- **Après** : Génération OTP locale + envoi via API SMS simple d'Ikoddi + vérification locale (hash PBKDF2)
- Contrôle total de l'expiration (5 minutes côté serveur)
- Plus de dépendance à l'API verify d'Ikoddi
- Le secret `IKODDI_OTP_APP_ID` n'est plus nécessaire

### Compatibilité mobile :
Le mobile appelle directement `supabase.functions.invoke('phone-auth', { body: { action, ... } })`.
