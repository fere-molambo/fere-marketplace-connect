
SET session_replication_role = 'replica';
DELETE FROM public.pending_payments;
DELETE FROM public.payment_transactions;
DELETE FROM public.pending_payouts;
SET session_replication_role = 'origin';
