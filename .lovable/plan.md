

# Nettoyage des données de commandes et transactions

## Données actuelles
| Table | Lignes |
|---|---|
| orders | 6 |
| order_items | 6 |
| payment_transactions | 17 |
| delivery_requests | 7 |
| pending_payouts | 8 |
| refunds | 0 |
| service_bookings | 16 |
| token_transactions | 11 |

## Plan

Exécuter des `DELETE` (via l'outil insert) sur les tables dans l'ordre suivant pour respecter les contraintes de clés étrangères :

1. **pending_payouts** (dépend de orders, delivery_requests, service_bookings)
2. **refunds** (dépend de orders, service_bookings)
3. **token_transactions** (référence service_bookings)
4. **delivery_requests** (dépend de orders)
5. **order_items** (dépend de orders)
6. **payment_transactions** (dépend de orders via related_id)
7. **orders**
8. **service_bookings**

Toutes les lignes de ces 8 tables seront supprimées. Aucune autre table (produits, services, shops, utilisateurs, etc.) ne sera touchée.

