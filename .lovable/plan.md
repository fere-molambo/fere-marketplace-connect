
# Plan : Corrections interface livreur, statut commande et remboursements

## Problemes identifies

Il y a 4 problemes distincts a corriger :

1. **Commande bloquee en "pending"** : Le statut de la commande n'a jamais ete mis a jour vers "cancelled" (la politique RLS bloquait au moment de l'annulation). C'est pourquoi l'apercu affiche "En attente" alors que le detail montre la livraison annulee. Il faut corriger les donnees.

2. **Pas de refund cree** : La table `refunds` n'a aucune politique RLS permettant aux clients d'inserer. Le code dans `RequestCancellationDialog` ne peut donc pas creer de remboursement. Il faut ajouter une politique INSERT pour les clients.

3. **Historique livreur** : Les livraisons annulees et livrees sont completement exclues de l'interface du livreur. Il faut ajouter une section "Historique" montrant ces livraisons passees (sans boutons d'action).

4. **Parametre Edge Function** : La page admin Paiements envoie `refundId` mais l'Edge Function attend `refund_id`. Les remboursements ne pourront jamais etre inities.

## Corrections prevues

### 1. Migration SQL

- Corriger le statut de la commande existante : `UPDATE orders SET status = 'cancelled' WHERE id = '518f2358-...'`
- Nettoyer les doublons de cancellations (5 enregistrements pour 1 commande, garder seulement le dernier)
- Creer le record de remboursement manquant pour cette commande
- Ajouter une politique RLS INSERT sur `refunds` permettant aux clients de creer des remboursements pour leurs propres commandes

```sql
CREATE POLICY "Users can create refunds for their orders"
ON public.refunds FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = refunds.order_id AND orders.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM service_bookings WHERE service_bookings.id = refunds.booking_id AND service_bookings.customer_id = auth.uid())
  )
);
```

### 2. Fichier `src/components/driver/DriverDeliveriesSection.tsx`

Ajouter une troisieme requete "delivery-history" qui recupere les livraisons avec statut `delivered` ou `cancelled` pour le livreur, et afficher une section "Historique" en bas (sans boutons d'action, uniquement informatif).

### 3. Fichier `src/pages/Payments.tsx`

Corriger `refundId` en `refund_id` dans les deux appels a l'Edge Function (initiate et verify) :
- Ligne 406 : `{ action: "initiate", refund_id: refund.id }`
- Ligne 430 : `{ action: "verify", refund_id: refund.id }`

## Resultats attendus

- Le client voit sa commande avec le badge "Annule" dans l'apercu ET le detail
- Le client voit son remboursement dans l'onglet "Remboursements" de son profil
- Le livreur ne voit plus de boutons d'action pour les livraisons annulees, mais les garde dans un historique
- L'admin voit le remboursement en attente dans le dashboard Paiements > Remboursements et peut le declencher via Paystack
- Les futures annulations de commandes prepayees creent automatiquement un enregistrement de remboursement
