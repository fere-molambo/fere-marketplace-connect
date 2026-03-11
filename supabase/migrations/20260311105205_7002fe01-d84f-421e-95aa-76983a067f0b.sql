
-- 1. pending_payouts
DELETE FROM public.pending_payouts;

-- 2. refunds
DELETE FROM public.refunds;

-- 3. token_transactions
DELETE FROM public.token_transactions;

-- 4. cancellations (references orders and service_bookings)
UPDATE public.orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;
DELETE FROM public.cancellations;

-- 5. delivery_requests
DELETE FROM public.delivery_requests;

-- 6. order_items
DELETE FROM public.order_items;

-- 7. payment_transactions
DELETE FROM public.payment_transactions;

-- 8. pending_payments
DELETE FROM public.pending_payments;

-- 9. orders
DELETE FROM public.orders;

-- 10. service_bookings
DELETE FROM public.service_bookings;
