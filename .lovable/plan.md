

# Nettoyage des donnees de test et correction du remboursement a 0 FCFA

## 1. Suppression du remboursement inutile a 0 FCFA

Quand le client annule apres l'arrivee du livreur, l'acompte est entierement consomme pour payer le livreur et la commission plateforme. Il n'y a rien a rembourser au client. Creer un enregistrement de remboursement avec `net_refund = 0` est inutile et confus.

**Correction dans `RequestCancellationDialog.tsx`** : Ne creer un enregistrement `refunds` que si `netRefund > 0`. Pour les annulations apres pickup/arrived, aucun enregistrement de remboursement ne sera cree puisque le client ne recoit rien.

## 2. Nettoyage complet des donnees de test

Purger toutes les donnees transactionnelles pour repartir sur une base propre :

```sql
-- Ordre de suppression respectant les cles etrangeres
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
DELETE FROM cancellations;
UPDATE orders SET cancellation_id = NULL;
DELETE FROM delivery_requests;
DELETE FROM order_items;
DELETE FROM payment_transactions;
DELETE FROM orders;
DELETE FROM service_bookings;
```

Les donnees preservees : profils, boutiques, produits, services, tokens, configurations.

## 3. Scenario de test de bout en bout

Apres le nettoyage, le flux complet a tester :

```text
1. Client passe commande -> paie l'acompte via Paystack
2. Livreur accepte et progresse : pending -> assigned -> picked_up -> en_route_client -> arrived
3. Client annule (pop-up avec motif d'annulation)
4. Systeme cree :
   - Annulation avec motif
   - Pending payout pour le livreur (driver_earnings)
   - Livraison retour "Retour colis ORD-XXXX vers Boutique YYYY" (is_return=true, status=en_route_vendor)
   - PAS de remboursement (net_refund serait 0)
5. Admin voit le payout en attente et valide
6. Livreur voit la livraison retour avec les etapes :
   - en_route_vendor -> Bouton "Arrive chez vendeur"
   - arrived_vendor -> "En attente de confirmation vendeur"
7. Vendeur confirme la reception -> stock restaure
8. Livreur peut prendre d'autres livraisons
```

## Fichiers modifies

1. `src/components/orders/RequestCancellationDialog.tsx` -- Ne pas creer de refund quand net_refund = 0
2. Migration SQL (donnees) -- Purge des donnees transactionnelles de test
