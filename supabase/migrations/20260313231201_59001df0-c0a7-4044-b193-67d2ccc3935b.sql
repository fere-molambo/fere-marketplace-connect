-- Nettoyage de toutes les données transactionnelles
-- (les données structurelles restent intactes)

DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;
DELETE FROM cancellations;
DELETE FROM delivery_requests;
DELETE FROM order_items;
DELETE FROM payment_transactions;
DELETE FROM pending_payments;
DELETE FROM orders;
DELETE FROM service_bookings;