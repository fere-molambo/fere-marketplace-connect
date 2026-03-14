

# Plan de corrections de sécurité

## Corrections a appliquer

### 1. user_tokens -- Supprimer la politique UPDATE (CRITIQUE)
Migration SQL pour supprimer la politique UPDATE qui permet aux utilisateurs de modifier leur solde arbitrairement. Les fonctions `add_tokens()` et `deduct_tokens()` (SECURITY DEFINER) restent le seul moyen de modifier les soldes.

### 2. pending_payments -- Restreindre l'accès (CRITIQUE)
Remplacer la politique SELECT `USING (true)` par :
- `auth.uid() = user_id` pour les utilisateurs authentifiés (le membre voit ses propres paiements)
- Admins/super_admins voient tout via `has_role()`
- Supprimer l'accès `anon`

### 3. profiles -- Restreindre l'accès PII (CRITIQUE)
Remplacer la politique "Authenticated users can view profiles for messaging" par une politique plus restrictive :
- L'utilisateur voit son propre profil
- Les participants d'une conversation voient les profils des autres participants
- Vendeurs et équipe voient les profils liés à leurs commandes/boutiques
- Admins/super_admins voient tout

### 4. is_shop_team_member() -- Ajouter filtre is_active
Recréer la fonction avec `AND is_active = true` dans la clause WHERE.

### 5. setup-super-admin -- Ajouter validation SETUP_SECRET
Vérifier le header `X-Setup-Secret` contre `Deno.env.get('SETUP_SECRET')`. Mettre a jour `Setup.tsx` pour envoyer ce header.

### 6. sync_order_status_from_delivery -- Corriger search_path
Ajouter `SET search_path TO 'public'` à la fonction.

### 7. Mot de passe "fere1234" -- Garder pour admin/super_admin uniquement
Le `reset-user-password` Edge Function est reservé aux admins et ne reset que le mot de passe email (pour admin/super_admin). Clarifier le texte dans `UserEditSheet.tsx` pour indiquer que ca ne s'applique qu'aux comptes admin. Les utilisateurs phone+PIN passent par la réinitialisation de PIN (via `phone-auth` action `reset-pin`).

Pas de changement sur `Setup.tsx` (c'est le setup initial, usage unique).

### Ce qui ne change PAS
- Leaked password protection (reporté)
- Shop contact info publique (choix métier)
- Reviews user_id exposé (nécessaire pour l'UX)
- Identity docs bucket (déjà privé, vérification info seulement)

## Fichiers impactés

| Fichier | Action |
|---|---|
| Nouvelle migration SQL | Politiques user_tokens, pending_payments, profiles, is_shop_team_member, sync_order_status |
| `supabase/functions/setup-super-admin/index.ts` | Ajouter validation X-Setup-Secret |
| `src/pages/Setup.tsx` | Envoyer header X-Setup-Secret |
| `src/components/users/UserEditSheet.tsx` | Clarifier que le reset password = admin/super_admin seulement |

