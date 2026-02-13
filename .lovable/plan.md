

# Corrections des bugs d'annulation de commande

## Problemes identifies

### Bug 1 : Montant de remboursement incorrect (5050 au lieu de 1122)

Le fichier `RequestCancellationDialog.tsx` calcule le remboursement comme `subtotal + delivery_fee` (4500 + 550 = 5050). Or, le client n'a paye que l'acompte (1122 FCFA). Le remboursement doit correspondre uniquement a ce qui a ete effectivement paye : `order.advance_amount`.

De plus, aucun enregistrement de remboursement n'est cree dans la table `refunds` car la condition exige `payment_status === "paid"`, alors qu'apres le paiement de l'acompte seul, le statut est `"partial"`.

### Bug 2 : Statut "En attente" au lieu de "Annulee" cote client

Apres l'annulation, le `RequestCancellationDialog` ferme le dialogue mais pas le `ClientOrderDetailSheet`. Le sheet conserve l'ancien objet `order` en memoire. La query `client-orders` est invalidee avec le queryKey `["client-orders"]` (sans user.id) alors que la query reelle utilise `["client-orders", user.id]`, donc le cache n'est pas rafraichi.

### Bug 3 : Bouton "Annuler la commande" toujours visible

Consequence directe du Bug 2 : comme l'objet `order` n'est pas rafraichi, `order.status` reste `"pending"` dans le composant, donc `canCancelBeforePickup()` retourne `true`.

### Bug 4 : Gains du livreur affiches (+440 FCFA) pour une livraison annulee avant pickup

Le champ `driver_earnings` (440) est defini a la creation de la demande de livraison et n'est jamais remis a zero lors d'une annulation. Dans l'historique du livreur, les gains sont affiches pour toutes les livraisons sans verifier si elles ont ete reellement effectuees.

## Corrections prevues

### 1. `src/components/orders/RequestCancellationDialog.tsx`

**Calcul du remboursement** (lignes 157-163) :
- Remplacer `productAmount + deliveryFee` par `order.advance_amount` pour les annulations avant pickup (refundType "full")
- Pour les annulations apres pickup (refundType "product_only"), le remboursement reste `advance_amount` diminue des frais de livraison

**Condition de creation du refund** (ligne 221) :
- Changer `order.payment_status === "paid"` en `["paid", "partial"].includes(order.payment_status)` pour couvrir le cas ou seul l'acompte a ete paye

**Montant du refund** :
- `amount` = `order.advance_amount` (ce qui a ete paye)
- `net_refund` = `order.advance_amount` (remboursement integral de l'acompte pour annulation avant pickup)
- Pour annulation apres pickup : `net_refund` = 0 (l'acompte couvre les frais de livraison + commission, pas de remboursement)

**Invalidation du cache** (lignes 261-263) :
- Ajouter `user.id` au queryKey : `["client-orders", user.id]` pour que le cache se rafraichisse correctement

### 2. `src/components/orders/ClientOrderDetailSheet.tsx`

**Fermeture automatique apres annulation** :
- Le composant ecoute deja les changements realtime sur `delivery_requests` mais pas sur `orders`. Ajouter une ecoute realtime sur la table `orders` pour detecter le changement de statut.

**Alternative plus simple** : Utiliser la donnee fraiche de la query `client-orders` plutot que le prop `order` statique. Ajouter un `useEffect` qui detecte quand la query est re-fetched et que l'ordre est passe a "cancelled", puis fermer le sheet automatiquement.

### 3. `src/components/driver/DriverDeliveriesSection.tsx`

**Gains pour livraisons annulees** (lignes 602-605) :
- Ne pas afficher les gains (`driver_earnings`) pour les livraisons annulees ou le colis n'a pas ete recupere (`status_at_cancellation` avant `picked_up`)
- La condition : afficher les gains seulement si `delivery.status === "delivered"` OU (`delivery.status === "cancelled"` ET `cancellation_info?.delivery_fee_kept === true`)

**Total du jour** (lignes 558-563) :
- La logique existante est deja correcte (elle filtre sur `delivery_fee_kept`), mais les gains individuels ne sont pas filtres de la meme maniere

## Detail technique

```text
Remboursement avant pickup :
  Ancien : refundAmount = subtotal + delivery_fee = 5050
  Nouveau : refundAmount = advance_amount = 1122
  net_refund = advance_amount = 1122

Remboursement apres pickup (arrive) :
  Ancien : refundAmount = subtotal = 4500
  Nouveau : refundAmount = 0 (l'acompte couvre les frais, pas de remboursement)
  
Gains livreur pour annulation avant pickup :
  Ancien : +440 FCFA affiches
  Nouveau : 0 FCFA (pas de gains car pas de service rendu)

Cache invalidation :
  Ancien : ["client-orders"] (ne correspond pas)
  Nouveau : ["client-orders", user.id] (correspond a la query)
```

## Fichiers modifies

1. `src/components/orders/RequestCancellationDialog.tsx` -- Correction calcul remboursement + condition refund + cache
2. `src/components/orders/ClientOrderDetailSheet.tsx` -- Rafraichissement apres annulation
3. `src/components/driver/DriverDeliveriesSection.tsx` -- Masquer gains pour annulations sans service rendu

