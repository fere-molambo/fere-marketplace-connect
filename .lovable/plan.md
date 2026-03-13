

# Nettoyage des commandes et transactions

Suppression de toutes les données transactionnelles dans l'ordre des dépendances (foreign keys) :

```sql
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;
DELETE FROM cancellations;
DELETE FROM delivery_requests;
DELETE FROM order_items;
DELETE FROM payment_transactions;
DELETE FROM orders;
DELETE FROM service_bookings;
```

Les données structurelles (shops, produits, services, profils) restent intactes.

