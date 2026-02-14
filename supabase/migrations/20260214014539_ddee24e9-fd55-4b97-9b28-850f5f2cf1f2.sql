-- Cleanup transactional test data for fresh testing
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