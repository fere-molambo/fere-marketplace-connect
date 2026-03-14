

# Phase 1 — Inscription et Connexion Phone + PIN (compatible mobile)

## Points importants pour la compatibilite mobile (Bolt.new)

L'Edge Function `phone-auth` est le seul point d'entree pour l'authentification phone+PIN. Le mobile n'aura qu'a appeler cette meme fonction via `supabase.functions.invoke('phone-auth', { body: { action, ... } })` — aucune logique cote client specifique au web. La session retournee (access_token + refresh_token) est standard Supabase et fonctionne identiquement sur mobile.

**Pre-requis confirme** : Le secret `ORANGE_MONEY_AUTH_HEADER` (Basic base64 du Client ID `hzDu13L7VRQDms88QVclncq3CBuEUyq0` + Client Secret) est deja configure et donne acces a l'API SMS Cote d'Ivoire via le meme flow OAuth2 que Orange Money.

**Question necessaire** : Quel numero expediteur (`senderAddress`) utiliser pour les SMS ? Le swagger montre `tel:+2250000` comme exemple. Avez-vous un numero attribue par Orange ou on utilise celui par defaut ?

---

## Etape 1 — Migration SQL

### 5 nouvelles tables :

**`pending_registrations`** — inscriptions en attente de validation OTP
- phone (text, UNIQUE), full_name, email (nullable), role (app_role), pin_hash, otp_code, otp_expires_at, otp_attempts (default 0), created_at

**`user_pins`** — PIN hashes et mot de passe interne pour les utilisateurs confirmes
- user_id (uuid, UNIQUE, FK auth.users ON DELETE CASCADE), pin_hash, internal_password, updated_at

**`login_attempts`** — protection brute-force
- phone (text, UNIQUE), attempts (default 0), last_attempt_at, blocked_until

**`otp_rate_limits`** — max 3 OTP/heure/numero
- phone, sent_at (default now())

**`pin_reset_requests`** — demandes de reset PIN par admin (prepare pour phase 2)
- user_phone, user_id (FK auth.users), status (default 'pending'), requested_at, processed_by_admin, processed_at

### Index :
- `idx_otp_rate_limits_phone_sent` sur (phone, sent_at)
- Index unique sur `pending_registrations.phone` et `login_attempts.phone`
- Contrainte unique sur `profiles.contact` (si pas deja en place — actuellement c'est un index non-unique, il faudra verifier s'il y a des doublons avant d'ajouter la contrainte)

### RLS :
- Toutes les tables : RLS active, aucune policy pour anon/authenticated (acces exclusivement via Edge Functions avec service_role)
- Exception : `pin_reset_requests` aura une policy SELECT pour les admins/super_admins (phase 2)

### Fonction de nettoyage :
- `cleanup_expired_registrations()` : supprime les pending ou `otp_expires_at < now()`

---

## Etape 2 — Edge Function `phone-auth`

Une seule fonction, `verify_jwt = false`, avec validation manuelle. 3 actions pour cette phase :

### Action `register`
1. Valide les entrees (phone format `+\d{10,15}`, full_name, role in [membre,vendeur,livreur], pin 6 chiffres, email optionnel)
2. Verifie que le phone n'existe pas dans `profiles.contact` ni dans `pending_registrations`
3. Verifie rate limit OTP : compte les entrees dans `otp_rate_limits` ou `sent_at > now() - 1 hour` pour ce phone — max 3
4. Hash le PIN avec bcrypt (`https://deno.land/x/bcrypt@v0.4.1/mod.ts`)
5. Upsert dans `pending_registrations` (permet de re-soumettre si OTP expire)
6. Genere OTP 6 chiffres aleatoire
7. Insere dans `otp_rate_limits`
8. Obtient token OAuth Orange (meme pattern que `getAccessToken` dans orange-money-payment)
9. Envoie SMS via `POST https://api.orange.com/smsmessaging/v1/outbound/tel:+2250000/requests`
10. Retourne `{ success: true }`

### Action `verify-registration`
1. Cherche le pending par phone
2. Verifie : OTP correct, non expire (5 min), max 5 tentatives (incremente `otp_attempts` a chaque essai)
3. Si invalide : retourne erreur. Si tentatives epuisees : supprime le pending
4. Si valide :
   - Genere un `internal_password` aleatoire (32 chars crypto)
   - Cree l'utilisateur Supabase Auth : `admin.createUser({ email: phone.replace('+','')+'@phone.fere.app', password: internal_password, email_confirm: true, user_metadata: { nom_complet, contact: phone } })`
   - Attend 1s pour le trigger `handle_new_user`
   - Met a jour le profil avec email optionnel si fourni
   - Insere dans `user_pins` (pin_hash + internal_password en clair cote serveur)
   - Insere dans `user_roles`
   - Supprime le pending
5. Retourne `{ success: true }` — pas de session, l'utilisateur doit se connecter

### Action `login`
1. Verifie `login_attempts` : si `blocked_until > now()`, retourne `{ error, blocked_until, remaining_seconds }`
2. Cherche le profil par `contact = phone` dans `profiles`
3. Si pas trouve : erreur generique "Identifiants incorrects"
4. Recupere `pin_hash` et `internal_password` depuis `user_pins` via `user_id`
5. Compare PIN soumis avec `pin_hash` via bcrypt
6. Si incorrect : upsert `login_attempts` (incremente, bloque 3 min apres 5 echecs)
7. Si correct :
   - Reset `login_attempts` (attempts=0, blocked_until=null)
   - Recupere l'email fictif du user (`phone.replace('+','')+'@phone.fere.app'`)
   - Appelle `supabaseAdmin.auth.signInWithPassword({ email, password: internal_password })`
   - Retourne `{ session }` avec access_token et refresh_token

**Securite** : Le `internal_password` n'est jamais expose au client. Il sert uniquement a generer une session Supabase valide cote serveur.

---

## Etape 3 — Frontend

### Nouveaux fichiers :
- `src/components/auth/PhoneLoginForm.tsx` — champ telephone + 6 inputs PIN (InputOTP existant)
- `src/components/auth/PhoneSignupForm.tsx` — nom, telephone, email (optionnel), role, PIN, confirm PIN → puis etape OTP
- `src/components/auth/OtpVerificationStep.tsx` — 6 inputs OTP, timer 5 min, bouton renvoyer (avec rate limit)

### Modifications :
- **`src/lib/validators.ts`** — ajouter `phoneLoginSchema` et `phoneSignupSchema`
- **`src/hooks/useAuth.tsx`** — ajouter `signInWithPin(phone, pin)`, `registerWithPhone(data)`, `verifyRegistrationOtp(phone, otp)`
- **`src/pages/Auth.tsx`** :
  - **Connexion** : detecter automatiquement si l'input commence par `+` → afficher champ PIN (InputOTP 6 chiffres) au lieu du mot de passe. Sinon → email+password classique (admin)
  - **Inscription** : remplacer le formulaire actuel par le formulaire phone-based. Les champs email/password disparaissent, remplaces par email optionnel + PIN 6 chiffres

### Compatibilite mobile :
Le mobile appellera directement `supabase.functions.invoke('phone-auth', { body: { action: 'login', phone, pin } })` sans passer par les composants React. Les hooks et composants frontend sont specifiques au web.

---

## Etape 4 — Config

- Ajouter `[functions.phone-auth]` avec `verify_jwt = false` dans `supabase/config.toml`
- Pas de nouveau secret necessaire (reutilisation de `ORANGE_MONEY_AUTH_HEADER`)

---

## Ce qui n'est PAS inclus dans cette phase

- Reset PIN (forgot-pin, reset-pin) → Phase 2
- Demande de reset par admin (pin_reset_requests UI) → Phase 2
- Nettoyage automatique via cron (cleanup_expired_registrations) → Phase 2

## Ordre d'implementation

1. Migration SQL (5 tables + index + RLS)
2. Edge Function `phone-auth` (register, verify-registration, login)
3. Validators + hooks useAuth
4. Composants auth (PhoneLoginForm, PhoneSignupForm, OtpVerificationStep)
5. Integration dans Auth.tsx

