

# Corrections de l'affichage retour (livreur) et recap vendeur

## Probleme 1 : "Livrée" au lieu de "Retourné" chez le livreur

Dans l'historique du livreur (`DriverDeliveriesSection.tsx`), la fonction `getStatusBadge` ne regarde que `delivery.status`. Pour une livraison retour terminee, `status = "delivered"` (contrainte DB), donc le badge affiche "Livrée".

**Correction** : Dans le rendu de l'historique (ligne 647), verifier `delivery.is_return` et `delivery.return_status === "returned"` pour afficher un badge "Retourné" (vert) au lieu de "Livrée".

## Probleme 2 : Recap vendeur incomplet et badge paiement incorrect

### 2a. Badge "Payé intégralement" incorrect

Le `OrderDetailSheet` recoit l'objet `order` depuis `OrdersTab`. La commande a `payment_status: "partial"` (acompte payé), mais le badge affiche "Payé intégralement". Cela vient probablement du fait que le trigger de synchronisation a mis a jour le `payment_status` a tort lors de la livraison retour. Il faut verifier les donnees en base, mais cote UI le `PaymentStatusBadge` est correct ("partial" = "Acompte payé"). Le probleme est donc dans les donnees.

**Verification** : Requete SQL pour confirmer le `payment_status` actuel. Si les donnees sont correctes ("partial"), alors c'est un bug d'affichage lie au passage de donnees.

### 2b. Statut retour manquant dans le recap vendeur

Le `CancellationBanner` recoit `returnStatus={order.return_status}` mais l'objet `order` passe par `OrdersTab` ne contient PAS de champ `return_status`. Ce champ existe sur `delivery_requests`, pas sur `orders`.

**Correction dans `OrderDetailSheet.tsx`** : Ajouter une requete pour recuperer les `delivery_requests` liees a la commande afin d'extraire le `return_status` de la livraison originale (ou de la livraison retour). Passer ce statut au `CancellationBanner`.

## Fichiers modifies

### 1. `src/components/driver/DriverDeliveriesSection.tsx`

Dans la section historique (ligne ~647), remplacer l'appel simple a `getStatusBadge(delivery.status)` par une logique conditionnelle :

```
Si delivery.is_return && delivery.return_status === "returned" :
  -> Badge vert "Retourné"
Si delivery.is_return && delivery.return_status !== "returned" :
  -> Badge ambre "Retour" (avec sous-statut)
Sinon :
  -> getStatusBadge(delivery.status) existant
```

Aussi, ajouter `return_status, is_return` dans la query `delivery-history` si pas deja present (le `*` les inclut deja).

### 2. `src/components/orders/OrderDetailSheet.tsx`

Ajouter une requete pour recuperer le `return_status` depuis `delivery_requests` :

```typescript
const { data: deliveryData } = useQuery({
  queryKey: ["order-delivery-status", order?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("delivery_requests")
      .select("status, return_status, is_return")
      .eq("order_id", order.id)
      .eq("is_return", false)
      .maybeSingle();
    return data;
  },
  enabled: !!order?.id && order?.status === "cancelled",
});
```

Passer `deliveryData?.return_status` au `CancellationBanner` au lieu de `order.return_status`.

### 3. Verification des donnees

Verifier en base que le `payment_status` de la commande est bien "partial" et non "paid" (un trigger pourrait l'avoir change par erreur lors du retour).

