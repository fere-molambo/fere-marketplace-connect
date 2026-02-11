

# Plan : Corriger la jointure refunds-profiles dans la page Paiements

## Probleme

La requete Supabase sur la table `refunds` echoue avec une erreur 400 :
`Could not find a relationship between 'refunds' and 'profiles' in the schema cache`

La colonne `user_id` de `refunds` a une cle etrangere vers `auth.users`, pas vers `profiles`. PostgREST ne peut donc pas resoudre la jointure `profiles!user_id`.

## Solution

Modifier la requete refunds dans `src/pages/Payments.tsx` pour :
1. Retirer la jointure `profiles` de la requete refunds
2. Recuperer les refunds sans les donnees utilisateur
3. Ajouter une requete separee pour charger les profils des utilisateurs concernes
4. Fusionner les donnees cote client

### Details techniques

**Fichier `src/pages/Payments.tsx`** (lignes 68-84) :

Remplacer la requete refunds par deux etapes :

```typescript
// Etape 1 : charger les refunds sans jointure profiles
const { data, error } = await supabase
  .from("refunds")
  .select(`
    *,
    order:orders(order_number),
    booking:service_bookings(id, services(name))
  `)
  .order("created_at", { ascending: false })
  .limit(50);

// Etape 2 : charger les profils des user_id uniques
const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
let profiles = [];
if (userIds.length > 0) {
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, nom_complet, contact")
    .in("id", userIds);
  profiles = profilesData || [];
}

// Etape 3 : fusionner
return data.map(refund => ({
  ...refund,
  user: profiles.find(p => p.id === refund.user_id) || null,
}));
```

Aucune autre modification necessaire - le reste du code utilise deja `refund.user?.nom_complet` qui fonctionnera avec cette structure.

