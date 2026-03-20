

# Plan : Finaliser le workflow auth + Prompt Bolt.new

## Analyse du code actuel

Le backend (`phone-auth/index.ts` et `create-user/index.ts`) est **complet et fonctionnel** :
- Inscription avec OTP via Ikoddi SMS
- Connexion phone + PIN
- Reset PIN self-service (OTP)
- Reset PIN admin (`admin-fix-user` avec PIN par défaut)
- Création d'équipe par vendeur (via `create-user`)

## Seul problème identifié

Le `UserEditSheet.tsx` affiche uniquement un bouton **"Réinitialiser le mot de passe"** (pour admins email). Il manque un bouton **"Réinitialiser le PIN"** pour les utilisateurs phone-based (membre, vendeur, livreur, equipe). L'action `admin-fix-user` existe déjà dans le backend mais n'est pas connectée dans l'UI admin.

## Modifications

### 1. `UserEditSheet.tsx` — Ajouter bouton "Réinitialiser le PIN"

Après le bloc actuel "Réinitialiser le mot de passe" (ligne 887-903), ajouter conditionnellement :
- Si l'utilisateur édité a un rôle phone-based (membre/vendeur/livreur/equipe) : afficher **"Réinitialiser le PIN (123456)"**
- Ce bouton appelle `supabase.functions.invoke("phone-auth", { body: { action: "admin-fix-user", phone: user.contact, new_pin: "123456" } })`
- Garder le bouton "Réinitialiser le mot de passe" existant uniquement pour les rôles admin/super_admin

### 2. Docs — Prompt Bolt.new complet

Mettre à jour `docs/BOLT_CLIENT_APP.md` et `docs/BOLT_DRIVER_APP.md` pour inclure une section claire sur la liste blanche Ikoddi pour les tests App Store/Play Store.

### 3. Générer le prompt Bolt.new

Après implémentation, je fournirai le prompt complet et détaillé à copier-coller dans Bolt.new couvrant :
- Connexion Supabase (URL + anon key)
- Inscription (phone-auth register + verify-registration)
- Connexion (phone-auth login + setSession)
- Reset PIN (self-service + admin)
- Profil et rôles (tables profiles, user_roles)
- Redirection selon le rôle
- Règles obligatoires (format phone, PIN 6 chiffres, etc.)

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/users/UserEditSheet.tsx` | Bouton "Réinitialiser le PIN" pour users phone-based |
| `docs/BOLT_CLIENT_APP.md` | Section tests App Store + liste blanche Ikoddi |
| `docs/BOLT_DRIVER_APP.md` | Idem |

