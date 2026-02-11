

# Fix : Interface livreur apres annulation + Remboursement paiement en ligne

## Probleme 1 : Le livreur voit encore les boutons d'action

La requete qui recupere les livraisons du livreur exclut seulement les statuts `pending` et `delivered`, mais pas `cancelled`. Quand un client annule une commande, la livraison passe en `cancelled` mais continue de s'afficher avec le bouton "Colis recupere".

**Correction** : Ajouter `.neq("status", "cancelled")` a la requete des livraisons du livreur dans `DriverDeliveriesSection.tsx`.

## Probleme 2 : Pas de remboursement cree pour les paiements en ligne

Quand un client annule une commande payee en ligne, le composant `RequestCancellationDialog` enregistre bien le `refund_amount` dans la table `cancellations`, mais ne cree jamais d'enregistrement dans la table `refunds`. Sans cet enregistrement, l'admin ne peut pas declencher le remboursement via Paystack depuis le dashboard Paiements.

**Correction** : Apres la creation de l'annulation, si le paiement est en ligne (`payment_method === 'online'` et `payment_status === 'paid'`), inserer un enregistrement dans la table `refunds` avec les montants corrects.

## Details techniques

### Fichier 1 : `src/components/driver/DriverDeliveriesSection.tsx`

Ajouter un filtre pour exclure les livraisons annulees dans la requete `my-deliveries` :

```
.neq("status", "pending")
.neq("status", "delivered")
.neq("status", "cancelled")  // <-- ajout
```

### Fichier 2 : `src/components/orders/RequestCancellationDialog.tsx`

Apres la mise a jour du statut de la commande (ligne ~218), ajouter la creation d'un enregistrement de remboursement :

```typescript
// Si paiement en ligne, creer un enregistrement de remboursement
if (order.payment_method === "online" && order.payment_status === "paid") {
  const deliveryFeeKept = statusInfo.refundType === "product_only";
  const productAmount = order.subtotal || 0;
  const deliveryFee = order.delivery_fee || 0;
  const netRefund = deliveryFeeKept ? productAmount : productAmount + deliveryFee;

  await supabase.from("refunds").insert({
    order_id: order.id,
    user_id: user.id,
    amount: order.total_amount,
    net_refund: netRefund,
    transaction_fee_deducted: deliveryFeeKept ? deliveryFee : 0,
    original_payment_reference: order.payment_reference,
    status: "pending",
    refund_status: "pending",
    cancellation_id: cancellation.id,
  });
}
```

Cela permet a l'admin de voir le remboursement dans le dashboard Paiements et de le declencher via Paystack (mode test ou production).

### Flux de remboursement complet

1. Le client annule sa commande prepayee
2. Un enregistrement `refunds` est cree avec le statut `pending`
3. L'admin voit le remboursement dans le dashboard Paiements
4. L'admin clique pour initier le remboursement, ce qui appelle l'Edge Function `process-refund`
5. L'Edge Function appelle l'API Paystack Refund
6. Le statut du remboursement passe a `processed`

En mode test Paystack, les remboursements fonctionnent de la meme maniere qu'en production, mais aucun argent reel n'est transfere.

