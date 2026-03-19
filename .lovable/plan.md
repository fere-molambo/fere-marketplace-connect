
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

2. **Edge Function `phone-auth`** — 7 actions :
   - `register` : validation, hash PIN, génération OTP locale, envoi SMS simple via Ikoddi
   - `verify-registration` : vérification OTP locale (hash PBKDF2), création user Supabase Auth
   - `login` : vérification PIN, session Supabase via mot de passe interne
   - `reset-pin-request` : OTP par SMS pour réinitialisation PIN
   - `reset-pin-confirm` : vérification OTP + nouveau PIN
   - `request-admin-reset` : demande manuelle à un admin
   - `admin-fix-user` : réparation de comptes créés hors du flux normal (admin only)

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

---

# Phase 1b — Création d'utilisateurs admin compatible phone+PIN

## Statut : ✅ IMPLÉMENTÉ

### Problème résolu :
La fonction `create-user` créait les utilisateurs avec email+password standard, sans entrée `user_pins`. Les utilisateurs créés par un admin ne pouvaient pas se connecter via phone+PIN.

### Changements :

1. **`create-user` Edge Function** — logique bifurquée :
   - **Rôles admin (super_admin, admin)** : email réel + mot de passe (inchangé)
   - **Rôles phone-based (vendeur, livreur, membre, equipe)** : email fictif (`{phone}@phone.fere.app`), UUID internal_password, PIN hashé PBKDF2, insertion `user_pins`

2. **`CreateUserDialog`** — formulaire adaptatif :
   - Le rôle est sélectionné en premier et détermine le mode du formulaire
   - Admin : email + mot de passe
   - Autres : contact (téléphone) + PIN 6 chiffres (InputOTP)

3. **Validators** — deux schémas séparés :
   - `createUserAdminSchema` (email + password)
   - `createUserPhoneSchema` (contact + PIN)

4. **`phone-auth` action `admin-fix-user`** :
   - Permet aux admins de réparer un compte cassé (mauvais internal_password)
   - Prend phone + nouveau PIN, regénère UUID, met à jour auth.users et user_pins

---

# Phase 1c — Synchronisation Web ↔ Mobile

## Statut : ✅ IMPLÉMENTÉ (Mars 2026)

### Bugs corrigés :

1. **`generateInternalPassword()`** dans `phone-auth/index.ts` :
   - **Avant** : base36 custom → produisait des chaînes invalides (ex: `026c031o532z...`)
   - **Après** : `crypto.randomUUID()` → compatible avec Supabase Auth
   - Impact : les utilisateurs inscrits depuis mobile peuvent maintenant se connecter

2. **Sender SMS Ikoddi** :
   - **Avant** : `from: 'Fere'` → rejeté par Ikoddi (sender non autorisé)
   - **Après** : `from: 'Ikoddi'` → SMS livrés correctement

### Documentation mobile mise à jour :
- `docs/BOLT_CLIENT_APP.md` : section auth → flux phone-auth Edge Function
- `docs/BOLT_DRIVER_APP.md` : section auth → flux phone-auth + auto-inscription livreur
- `docs/MOBILE_API_REFERENCE.md` : section auth → flux phone-auth
