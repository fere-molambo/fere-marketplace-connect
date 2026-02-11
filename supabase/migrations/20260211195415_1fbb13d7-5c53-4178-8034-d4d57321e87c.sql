
-- 1. Fix stuck order status
UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = '518f2358-c232-47bb-9845-fdff8fe9c30b' AND status = 'pending';

-- 2. Clean duplicate cancellations (keep only the latest one)
DELETE FROM public.cancellations 
WHERE order_id = '518f2358-c232-47bb-9845-fdff8fe9c30b' 
AND id != (
  SELECT id FROM public.cancellations 
  WHERE order_id = '518f2358-c232-47bb-9845-fdff8fe9c30b' 
  ORDER BY created_at DESC LIMIT 1
);

-- 3. Create missing refund record for the prepaid cancelled order
INSERT INTO public.refunds (order_id, user_id, amount, net_refund, transaction_fee_deducted, original_payment_reference, status, refund_status, cancellation_id)
SELECT 
  o.id,
  o.user_id,
  o.total_amount,
  o.total_amount, -- full refund since delivery hadn't been picked up
  0,
  o.payment_reference,
  'pending',
  'pending',
  c.id
FROM public.orders o
JOIN public.cancellations c ON c.order_id = o.id
WHERE o.id = '518f2358-c232-47bb-9845-fdff8fe9c30b'
AND o.payment_method = 'online'
AND NOT EXISTS (SELECT 1 FROM public.refunds WHERE order_id = o.id)
LIMIT 1;

-- 4. Add RLS INSERT policy on refunds for clients
CREATE POLICY "Users can create refunds for their orders"
ON public.refunds FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = refunds.order_id AND orders.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM service_bookings WHERE service_bookings.id = refunds.booking_id AND service_bookings.customer_id = auth.uid())
  )
);
