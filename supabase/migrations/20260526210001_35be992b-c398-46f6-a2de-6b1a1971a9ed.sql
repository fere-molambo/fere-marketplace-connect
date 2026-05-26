
-- Disable triggers temporarily to avoid cascade side-effects during mass delete
SET session_replication_role = 'replica';

DELETE FROM public.live_tracking_sessions WHERE reference_type = 'delivery_request';
DELETE FROM public.client_penalties WHERE source_order_id IS NOT NULL OR applied_to_order_id IS NOT NULL OR source_delivery_id IS NOT NULL;
DELETE FROM public.pending_payouts WHERE order_id IS NOT NULL OR delivery_request_id IS NOT NULL;
DELETE FROM public.refunds WHERE order_id IS NOT NULL;
DELETE FROM public.cancellations WHERE order_id IS NOT NULL;
DELETE FROM public.payment_transactions WHERE payment_type IN ('order', 'order_balance');
DELETE FROM public.delivery_requests;
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.pending_payments WHERE order_id IS NOT NULL;

SET session_replication_role = 'origin';
