

# Plan : Corriger l'affichage des remboursements et ameliorer la page Transactions

## Probleme principal

L'onglet "Remboursements" de la page Paiements affiche 0 resultats malgre la presence d'un remboursement en base. La cause : la requete Supabase utilise `profiles!refunds_user_id_fkey` comme hint de jointure, mais cette cle etrangere pointe vers `auth.users` et non vers `profiles`. PostgREST ne peut pas resoudre la jointure et retourne un resultat vide.

## Corrections

### 1. Corriger la jointure dans `src/pages/Payments.tsx`

Ligne 72 : remplacer `profiles!refunds_user_id_fkey` par `profiles!user_id` (hint par nom de colonne au lieu du nom de contrainte FK).

```
// Avant
user:profiles!refunds_user_id_fkey(nom_complet, contact),

// Apres
user:profiles!user_id(nom_complet, contact),
```

### 2. Ameliorer `src/pages/Transactions.tsx`

Ajouter une colonne "Remboursement" dans le tableau des transactions :

- Pour les transactions de type `order` avec statut `success`, verifier si un remboursement existe dans la table `refunds` pour le meme `related_id` (qui correspond a l'`order_id`).
- Afficher un badge indiquant le statut du remboursement (En attente, En cours, Rembourse, ou rien).
- Ajouter un bouton "Voir" qui redirige vers `/dashboard/payments` avec l'onglet Remboursements pre-selectionne.

Pour ce faire :
- Enrichir la requete des transactions pour aussi fetcher les refunds lies : ajouter une sous-requete jointe `refund:refunds!order_id(id, status, refund_status, net_refund)` via `related_id`.
- Comme `related_id` dans `payment_transactions` correspond a `order_id` dans `refunds`, et qu'il n'y a pas de FK directe, on fera une requete separee pour les refunds et on les matchera cote client par `order_id`/`related_id`.
- Ajouter une colonne "Remb." avec un badge cliquable qui renvoie vers `/dashboard/payments?tab=refunds`.

### 3. Details techniques

**Fichier `src/pages/Payments.tsx`** :
- Corriger la ligne 72 (jointure FK)

**Fichier `src/pages/Transactions.tsx`** :
- Ajouter une requete `useQuery` pour charger les remboursements (`refunds` table, select `id, order_id, status, refund_status, net_refund`)
- Ajouter une colonne "Remb." dans le tableau
- Pour chaque transaction de type `order`/`service_booking` avec `status === 'success'`, chercher un refund correspondant par `related_id === refund.order_id`
- Afficher un badge de statut de remboursement et un lien vers la page Paiements
- Importer `useNavigate` et `RefreshCcw` icon

**Fichier `src/pages/Payments.tsx` (onglet refunds)** :
- Lire le parametre `tab` de l'URL pour pre-selectionner l'onglet si `?tab=refunds` est present
