

# Plan : Corriger les mises a jour de statut livreur et les regles d'annulation client

## Problemes identifies

### 1. Erreur "en route vers client"
Le trigger `sync_order_status_from_delivery` s'execute avec les permissions de l'utilisateur appelant (le livreur). Il tente de faire un `UPDATE` sur la table `orders`, mais le livreur n'est pas le proprietaire de la commande. La politique RLS de `orders` bloque cette mise a jour. Meme si cela ne genere pas une erreur PostgreSQL visible, PostgREST peut interpreter le resultat comme un echec silencieux qui perturbe la transaction.

**Solution** : Modifier le trigger `sync_order_status_from_delivery` pour le rendre `SECURITY DEFINER`, comme c'est deja le cas pour `handle_delivery_completed`. Cela permet au trigger de mettre a jour les commandes independamment du role de l'utilisateur.

### 2. Annulation client apres "colis recupere"
Le client ne doit PAS pouvoir annuler apres que le livreur a marque "colis recupere". Seul le livreur peut gerer l'annulation au stade "arrive chez client". Actuellement, le bouton d'annulation reste visible pour le client dans certains cas.

**Solution** : Modifier la logique `canCancelOrder` dans `ClientOrderDetailSheet.tsx` et `SubDeliveryCard.tsx` pour desactiver l'annulation quand le statut de livraison est `picked_up`, `en_route_client` ou `arrived`.

### 3. Informations financieres pour le livreur
Au stade "arrive", le livreur doit voir clairement combien il recevra pour cette livraison. C'est deja partiellement affiche mais peut etre ameliore dans le dialog de confirmation.

## Modifications techniques

### Fichier 1 : Migration SQL
- Modifier `sync_order_status_from_delivery` pour ajouter `SECURITY DEFINER` et `SET search_path TO 'public'`

```sql
CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- (meme corps de fonction)
$function$;
```

### Fichier 2 : `src/components/orders/ClientOrderDetailSheet.tsx`
- Modifier `canCancelOrder()` (ligne 163) pour verifier que AUCUNE livraison n'a le statut `picked_up`, `en_route_client` ou `arrived`
- Ajouter un message informatif quand l'annulation est bloquee (ex: "Le colis a ete recupere. Contactez le livreur.")

```typescript
const canCancelOrder = () => {
  if (order.status === "cancelled" || order.status === "delivered") return false;
  if (order.delivery_type === "delivery") {
    // Bloquer l'annulation si une livraison est en cours (apres pickup)
    const hasPickedUp = deliveryRequests.some((dr: any) =>
      ["picked_up", "en_route_client", "arrived"].includes(dr.status)
    );
    if (hasPickedUp) return false;
    return deliveryRequests.some((dr: any) =>
      !["delivered", "cancelled"].includes(dr.status)
    );
  }
  return true;
};
```

- Ajouter un message contextuel quand le colis est recupere, informant le client que seul le livreur peut gerer

### Fichier 3 : `src/components/orders/SubDeliveryCard.tsx`
- Modifier `canCancel` pour exclure les statuts `picked_up`, `en_route_client`, `arrived`
- Afficher un message d'information a la place du bouton

```typescript
const canCancel = deliveryRequest?.status &&
  !["delivered", "cancelled", "picked_up", "en_route_client", "arrived"]
    .includes(deliveryRequest.status);
```

### Fichier 4 : `src/components/driver/DriverCancellationDialog.tsx`
- Ajouter l'affichage des gains du livreur (`delivery.driver_earnings`) dans le dialog
- Le livreur doit voir clairement : "Vos gains pour cette livraison : X FCFA"

### Fichier 5 : `src/components/driver/DriverDeliveriesSection.tsx`
- Afficher plus clairement les gains au stade "arrived" avec un encadre visible

