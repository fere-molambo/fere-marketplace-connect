

# Plan : Corriger la politique RLS sur story_views

## Ce qui sera fait

### 1. Migration SQL
Remplacer la politique INSERT permissive sur `story_views` :
```sql
DROP POLICY IF EXISTS "Anyone can record a story view" ON public.story_views;
CREATE POLICY "Users can record their own story views"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid());
```

### 2. Marquer le finding "Leaked Password Protection"
Comme cette fonctionnalité nécessite le plan Pro de Supabase et que tu es sur le plan Free, on marquera cette alerte comme ignorée avec cette justification.

### 3. Ce que tu dis à Bolt.new

> "Les corrections de sécurité suivantes ont été appliquées :
> 
> 1. **story_views** : la politique INSERT permissive (`WITH CHECK (true)`) a été remplacée par `WITH CHECK (viewer_id = auth.uid())` — seuls les utilisateurs authentifiés peuvent enregistrer leurs propres vues.
> 
> 2. **5 tables sans politique** (login_attempts, otp_rate_limits, pending_pin_resets, pending_registrations, user_pins) : c'est intentionnel. RLS activé + zéro politique = accès bloqué pour tous les clients. Seules les Edge Functions y accèdent via service_role_key. Ne pas ajouter de politiques.
> 
> 3. **Leaked Password Protection** : nécessite le plan Pro Supabase, pas disponible sur le plan Free. Impact limité car les utilisateurs standards utilisent phone+PIN, seuls les admins utilisent email/mot de passe."

## Fichier modifié

| Fichier | Action |
|---|---|
| `supabase/migrations/[new].sql` | Remplacer la politique INSERT sur `story_views` |

