
DROP POLICY "Customers can cancel their delivery requests" ON public.delivery_requests;

CREATE POLICY "Customers can cancel their delivery requests"
ON public.delivery_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = delivery_requests.order_id
    AND orders.user_id = auth.uid()
  )
  AND status <> ALL (ARRAY['delivered'::text, 'cancelled'::text])
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = delivery_requests.order_id
    AND orders.user_id = auth.uid()
  )
);

UPDATE delivery_requests
SET status = 'cancelled'
WHERE order_id = '518f2358-c232-47bb-9845-fdff8fe9c30b';
