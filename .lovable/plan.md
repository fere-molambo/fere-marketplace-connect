
## Diagnostic confirmé

L'utilisateur `+22376771321` (Junior MOLAMBO, id `69b22fdf-…`) existe dans `auth.users` (créé 2026-04-07) mais **n'a aucune ligne dans `profiles`**. Il a `user_roles=membre` et `user_pins` corrects.

**Cause racine** : tu avais supprimé son `profiles` (probablement à la main dans le SQL editor, ou via un ancien `delete-user` qui a partiellement échoué) **sans supprimer `auth.users`**. Aujourd'hui il s'est réinscrit depuis le mobile → le code est tombé dans la branche "recovering account" de `phone-auth/verify-registration` (logs : *"User already exists for 22376771321@phone.fere.app — recovering account"*). Cette branche fait un `updateUserById` et attend 1.5s le trigger `handle_new_user`… **mais ce trigger ne se déclenche que sur INSERT, pas sur UPDATE**. Résultat : pas de profil créé → le login phone+PIN échoue avec "Identifiants incorrects" car il cherche via `profiles.contact`.

## Plan de correction

### 1. Migration : recréer le profil manquant pour Junior

```sql
INSERT INTO public.profiles (id, nom_complet, contact, created_at, updated_at)
VALUES ('69b22fdf-db44-4c7b-8a1e-720f9a2124d5', 'Junior MOLAMBO', '+22376771321', now(), now())
ON CONFLICT (id) DO NOTHING;
```

Après ça, Junior pourra se connecter immédiatement avec son numéro + PIN.

### 2. Patch `supabase/functions/phone-auth/index.ts` (branche "recovering account")

Dans `handleVerifyRegistration`, après le bloc de récupération (lignes 447-468), ajouter un **upsert explicite du profil** pour ne plus dépendre du trigger `handle_new_user` qui ne tire pas en UPDATE :

```ts
// Force profile presence (handle_new_user trigger only fires on INSERT,
// so recovering an existing auth user leaves profiles empty)
await supabaseAdmin.from('profiles').upsert({
  id: userId,
  nom_complet: pending.full_name,
  contact: phone,
  email: pending.email || null,
}, { onConflict: 'id' });
```

Cet upsert est idempotent : ne casse rien sur le chemin nominal (création standard), et garantit qu'une réinscription "recovery" crée le profil.

### 3. Aucune modif côté `delete-user`

Le code actuel supprime déjà profil + auth.users dans le bon ordre. Le scénario qui a causé l'orphelin était une suppression manuelle (dashboard SQL) du profil sans `auth.users`. Pas besoin de changer la fonction.

## Réponse à tes questions

- **Faut-il rebuild/réuploader l'APK sur Play Store ?** → **Non.** Le bug est 100% côté edge function Supabase. Les edge functions se déploient automatiquement après ce patch — l'app mobile existante en bénéficie immédiatement, sans rebuild.
- **Quoi dire à Bolt ?** → **Rien.** Aucun changement requis côté app mobile. Le contrat JSON de `phone-auth` ne change pas.

## Vérification post-déploiement

1. SQL : vérifier que `SELECT id FROM profiles WHERE contact='+22376771321'` retourne bien Junior.
2. Demander à Junior de se connecter sur l'app mobile avec son PIN.
3. Pour valider le fix structurel : supprimer un profil de test à la main (sans toucher auth.users), refaire une inscription depuis le même numéro → vérifier que le nouveau profil est bien recréé.
