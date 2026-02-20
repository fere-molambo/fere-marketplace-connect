
-- 1. Nullifier les references circulaires
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;

-- 2. Supprimer dans l'ordre des dependances
DELETE FROM pending_payouts WHERE order_id IS NOT NULL OR delivery_request_id IS NOT NULL;
DELETE FROM refunds;
DELETE FROM client_penalties;
DELETE FROM cancellations;
DELETE FROM order_items;
DELETE FROM delivery_requests;
DELETE FROM payment_transactions WHERE payment_type IN ('order', 'order_balance');
DELETE FROM orders;
