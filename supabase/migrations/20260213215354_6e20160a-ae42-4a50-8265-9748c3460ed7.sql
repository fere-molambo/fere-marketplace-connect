
-- Nullify FK references first
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;

-- Now delete in correct order
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
DELETE FROM cancellations;
DELETE FROM delivery_requests;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM service_bookings;
DELETE FROM payment_transactions;
