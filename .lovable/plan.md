

# Corriger la création d'utilisateurs depuis l'interface admin

## Probleme

La fonction `create-user` crée l'utilisateur dans auth.users avec un email réel et un mot de passe, mais ne crée **pas** d'entrée dans `user_pins`. Quand l'utilisateur essaie de se connecter via phone+PIN, le login échoue car `user_pins` est vide pour cet utilisateur.

Pour les rôles phone-based (membre, vendeur, livreur, équipe), il faut :
- Utiliser l'email fictif (`{phone}@phone.fere.app`) dans auth.users
- Générer un `internal_password` (UUID) pour le mot de passe auth
- Stocker le PIN hashé + internal_password dans `user_pins`

## Changements

### 1. `supabase/functions/create-user/index.ts`

Adapter la logique selon le rôle :

- **Rôles admin (super_admin, admin)** : garder le comportement actuel (email réel + mot de passe)
- **Rôles phone-based (vendeur, livreur, membre, equipe)** :
  - Demander un PIN (6 chiffres) au lieu d'un mot de passe
  - Créer l'utilisateur avec l'email fictif (`{contact_sans_plus}@phone.fere.app`) et un UUID comme internal_password
  - Hasher le PIN avec PBKDF2
  - Insérer dans `user_pins` (pin_hash + internal_password)

### 2. `src/components/users/CreateUserDialog.tsx`

- Conditionner le formulaire selon le rôle sélectionné :
  - **admin/super_admin** : afficher email + mot de passe (comme aujourd'hui)
  - **Autres rôles** : afficher contact (téléphone) + PIN (6 chiffres) + confirmation PIN. Email optionnel (stocké dans profile uniquement)

### 3. `src/lib/validators.ts`

- Adapter `createUserSchema` pour supporter les deux modes (email+password ou phone+PIN selon le rôle)

### 4. Correction du compte "themis"

- Ajouter une action `admin-fix-user` dans `phone-auth` edge function qui :
  - Prend phone + nouveau PIN
  - Regénère un internal_password (UUID)
  - Met à jour auth.users via `admin.updateUserById` avec le nouvel internal_password
  - Upsert `user_pins` avec le nouveau pin_hash et internal_password
  - Accessible uniquement par super_admin/admin

## Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/functions/create-user/index.ts` | Ajouter logique phone-based (fictive email, PIN, user_pins) |
| `src/components/users/CreateUserDialog.tsx` | Formulaire adaptatif selon le rôle |
| `src/lib/validators.ts` | Schéma adaptatif pour les deux modes |
| `supabase/functions/phone-auth/index.ts` | Ajouter action `admin-fix-user` |

