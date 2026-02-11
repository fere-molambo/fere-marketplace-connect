DROP POLICY "Users can cancel their own orders" ON public.orders;

CREATE POLICY "Users can cancel their own orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status <> ALL (ARRAY['delivered'::text, 'cancelled'::text])
)
WITH CHECK (
  auth.uid() = user_id
);