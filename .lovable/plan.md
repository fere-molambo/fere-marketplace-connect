

# Plan : Blocage utilisateurs par admin + Prompt Bolt.new pour création boutique vendeur

## Partie 1 : Blocage d'utilisateurs par admin/super_admin

### Contexte actuel
- La table `blocked_users` existe deja mais est concue pour le blocage entre utilisateurs dans la messagerie (blocker_id/blocked_id).
- La table `profiles` n'a pas de champ `is_blocked`.
- Il n'existe aucun mecanisme pour empecher un utilisateur bloque de se connecter ou d'utiliser l'app.
- Les vendeurs peuvent etre desactives via `verification_status` sur leur boutique, mais pas bloques au niveau compte.

### Ce qui sera fait

#### 1. Migration DB : ajouter des champs de blocage sur `profiles`

```sql
ALTER TABLE public.profiles
  ADD COLUMN is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN blocked_reason text,
  ADD COLUMN blocked_at timestamptz,
  ADD COLUMN blocked_by uuid REFERENCES auth.users(id);
```

C'est plus simple et plus performant qu'une table separee : le blocage admin est un attribut du compte, pas une relation entre utilisateurs.

#### 2. Edge function `phone-auth` : bloquer la connexion

Dans les actions `login` et `verify-login-otp`, apres avoir identifie l'utilisateur, verifier `profiles.is_blocked`. Si bloque, retourner une erreur avec le motif et les coordonnees du support :

```json
{
  "success": false,
  "error": "account_blocked",
  "message": "Votre compte a été suspendu.",
  "reason": "Violation des conditions d'utilisation",
  "support_phone": "+223...",
  "support_email": "support@fere.app"
}
```

Les coordonnees du support seront lues depuis `platform_settings` (on ajoutera `support_email` et `support_phone` si absents).

#### 3. Interface admin : bouton Bloquer/Debloquer dans UserEditSheet

- Ajouter un bouton "Bloquer cet utilisateur" (rouge) dans le sheet d'edition utilisateur
- Dialog de confirmation avec champ raison (obligatoire)
- Ne pas pouvoir se bloquer soi-meme, ni bloquer un super_admin
- Un admin ne peut bloquer que des utilisateurs de rang inferieur (pas d'autres admins)
- Bouton "Debloquer" si deja bloque, avec confirmation

#### 4. Indicateur visuel dans UserTable

- Badge rouge "Bloque" a cote du nom des utilisateurs bloques
- Filtre optionnel pour voir les utilisateurs bloques

#### 5. Migration DB : champs support dans platform_settings (si absents)

```sql
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'support@fere.app',
  ADD COLUMN IF NOT EXISTS support_phone text DEFAULT '+22300000000';
```

### Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/migrations/[new].sql` | Champs `is_blocked`, `blocked_reason`, `blocked_at`, `blocked_by` sur profiles + support sur platform_settings |
| `supabase/functions/phone-auth/index.ts` | Verifier blocage a la connexion |
| `src/components/users/UserEditSheet.tsx` | Bouton bloquer/debloquer + dialog |
| `src/components/users/UserTable.tsx` | Badge "Bloque" |

---

## Partie 2 : Prompt Bolt.new pour creation boutique vendeur

Pas de code a modifier ici. Je vais fournir un prompt complet et pret a copier-coller dans Bolt.new, couvrant :

1. **Inscription vendeur** : utiliser `phone-auth` avec `role: "vendeur"`
2. **Creation de boutique** : INSERT dans `shops` avec `verification_status: 'pending'`, `owner_id` = l'utilisateur connecte
3. **Ajout produits/services** : INSERT dans `products`/`services` avec `is_active: true` (visible pour le vendeur mais la boutique n'etant pas verifiee, rien n'est visible publiquement)
4. **Notification admin** : INSERT dans `notifications` ou appel a `send-notification` pour alerter les admins qu'une nouvelle boutique a ete creee
5. **Visibilite** : expliquer que les boutiques `pending` ne sont pas visibles sur le catalogue public, et que l'admin les active depuis le dashboard web
6. **Desactivation produits/services** : le vendeur peut toggle `is_active` sur ses produits/services

Le prompt sera fourni directement dans le message d'implementation.

