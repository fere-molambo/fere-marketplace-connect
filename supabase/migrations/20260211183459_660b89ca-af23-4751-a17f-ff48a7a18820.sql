-- Nettoyage complet des données de test

-- 0. Nullifier les références cancellation_id dans orders
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;

-- 1. Annulations
DELETE FROM cancellations;

-- 2. Pénalités client
DELETE FROM client_penalties;

-- 3. Paiements en attente
DELETE FROM pending_payouts;

-- 4. Demandes de livraison
DELETE FROM delivery_requests;

-- 5. Articles des commandes
DELETE FROM order_items;

-- 6. Transactions de paiement (type order uniquement)
DELETE FROM payment_transactions WHERE payment_type = 'order';

-- 7. Commandes
DELETE FROM orders;