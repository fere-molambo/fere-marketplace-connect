
-- Step 1: Remove FK references first
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;

-- Step 2: Delete in correct FK order
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
DELETE FROM cancellations;
DELETE FROM delivery_requests;
DELETE FROM order_items;
DELETE FROM payment_transactions;
DELETE FROM orders;
DELETE FROM service_bookings;
