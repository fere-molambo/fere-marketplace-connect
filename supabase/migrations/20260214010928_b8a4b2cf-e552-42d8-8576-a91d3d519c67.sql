CREATE POLICY "Clients can create payouts for cancelled orders"
ON public.pending_payouts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = pending_payouts.order_id 
    AND orders.user_id = auth.uid()
    AND orders.status = 'cancelled'
  )
);