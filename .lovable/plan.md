

# Plan : Nettoyage complet des données transactionnelles

## Objectif
Supprimer toutes les commandes, réservations, livraisons, paiements, annulations et données associées. Les boutiques, produits, services, utilisateurs et configuration restent intacts.

## Tables à vider (dans l'ordre des dépendances FK)

1. `pending_payouts` (5 lignes) — dépend de orders, delivery_requests, bookings
2. `refunds` (0 lignes) — dépend de orders, bookings, cancellations
3. `cancellations` (4 lignes) — dépend de orders, bookings
4. `order_items` (6 lignes) — dépend de orders
5. `delivery_requests` (8 lignes) — dépend de orders
6. `payment_transactions` (8 lignes) — liées aux orders/bookings
7. `orders` (6 lignes)
8. `service_bookings` (9 lignes)

## Migration SQL unique

```sql
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM cancellations;
DELETE FROM order_items;
DELETE FROM delivery_requests;
DELETE FROM payment_transactions;
DELETE FROM orders;
DELETE FROM service_bookings;
```

## Ce qui ne sera PAS touché
- Utilisateurs, profils, rôles
- Boutiques, produits, services, catégories
- Conversations, messages
- Favoris, avis
- Tokens (soldes et historique)
- Configuration plateforme, zones de livraison

